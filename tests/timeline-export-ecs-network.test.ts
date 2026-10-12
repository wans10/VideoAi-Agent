import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';

const env = {
  NODE_ENV: 'production', TIMELINE_EXPORT_ECS_CLUSTER: 'keyvo-render',
  TIMELINE_EXPORT_ECS_TASK_DEFINITION: 'keyvo-timeline-export:1',
  TIMELINE_EXPORT_ECS_REGION: 'ap-southeast-1',
  TIMELINE_EXPORT_ECS_SUBNETS: 'subnet-private',
  TIMELINE_EXPORT_ECS_SECURITY_GROUP: 'sg-worker',
};

test('Fargate command preserves targeting and validates private NAT/public network policies before launch', async () => {
  const compiled = await build({entryPoints:['frontend/src/server/timeline-exports/ecs-runner.ts'], bundle:true,
    platform:'node',format:'cjs',write:false,external:['server-only','@aws-sdk/client-ecs']});
  const commands: any[] = [];
  const module = {exports:{} as any};
  runInNewContext(compiled.outputFiles[0]!.text, {module,exports:module.exports,process:{env:{}},
    require(id:string) {
      if(id==='server-only')return {};
      if(id==='@aws-sdk/client-ecs')return {
        RunTaskCommand:class {constructor(public input:any){}},
        ECSClient:class {async send(command:any){commands.push(command.input);return {tasks:[{taskArn:'task-fixture'}]};}},
      };
      throw Error(`Unexpected import ${id}`);
    },
  });
  for(const value of [undefined,'','ENABLED','DISABLED',' DISABLED ']) {
    await module.exports.launchTimelineExportWorkerTask({exportId:'owned-export',env:{...env,TIMELINE_EXPORT_ECS_ASSIGN_PUBLIC_IP:value}});
    const input=commands.at(-1);
    assert.equal(input.networkConfiguration.awsvpcConfiguration.assignPublicIp,value?.trim()||'ENABLED');
    assert.equal(input.networkConfiguration.awsvpcConfiguration.subnets[0],'subnet-private');
    assert.equal(input.launchType,'FARGATE');
    assert.equal(input.count,1);
    assert.equal(input.overrides.containerOverrides[0].name,'timeline-export-worker');
    assert.equal(input.overrides.containerOverrides[0].environment[0].value,'owned-export');
  }
  for(const value of ['false','disabled','DISABLE','ENABLED,DISABLED']) {
    const invalid={...env,TIMELINE_EXPORT_ECS_ASSIGN_PUBLIC_IP:value};
    assert.throws(()=>module.exports.assertTimelineExportWorkerLauncherConfigured(invalid),/INVALID_TIMELINE_EXPORT_ECS_ASSIGN_PUBLIC_IP/);
    await assert.rejects(module.exports.launchTimelineExportWorkerTask({exportId:'owned-export',env:invalid}),/INVALID_TIMELINE_EXPORT_ECS_ASSIGN_PUBLIC_IP/);
  }
  assert.equal(commands.length,5,'Invalid policy must never launch an AWS task.');
});
