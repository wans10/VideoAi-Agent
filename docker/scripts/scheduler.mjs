// Sequential requests; server-side leases own concurrency and recovery.
const token=process.env.CRON_SECRET?.trim();
if(!token)throw new Error('CRON_SECRET is required');
const origin=process.env.SCHEDULER_ORIGIN??'http://web:3000';
const routes=['studio-tasks','studio-analyses','fal-poll','byteplus-poll','kling-direct-poll','google-vertex-veo-poll','llmhub-video-poll','google-vertex-omni-poll','luma-agents-poll','alibaba-model-studio-poll'];
let pass=0;
for(;;){
  const selected=pass++%10===0?[...routes,'mcp-reference-upload-cleanup','reconcile-missing-jobs']:routes;
  for(const route of selected){
    try{const response=await fetch(`${origin}/api/cron/${route}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(55_000)});if(!response.ok)console.error('[scheduler]',route,response.status);}
    catch{console.error('[scheduler]',route,'request failed; saved work remains pending');}
  }
  await new Promise(resolve=>setTimeout(resolve,60_000));
}
