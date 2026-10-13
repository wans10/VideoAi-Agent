import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const handler = runInNewContext(`${readFileSync('docker/cloudfront/keyvo-private-timeline-exports.js', 'utf8')}; handler`);
test('CDN private export guard rejects full, HEAD and Range requests before cache lookup', () => {
  for (const uri of ['/timeline-exports/user/movie.mp4', '/timeline-exports', '/%74imeline-exports/user/movie.mp4']) {
    for (const method of ['GET', 'HEAD']) {
      assert.equal(handler({ request: { uri, method, headers: { range: { value: 'bytes=0-1023' } } } }).statusCode, 403);
    }
  }
  assert.equal(handler({ request: { uri: '/%zz' } }).statusCode, 400);
});
test('the guard preserves public demos and unrelated storage readers exactly', () => {
  for (const uri of ['/public/demo.mp4', '/renders/videos/public-example.mp4', '/timeline-exports-demo/poster.jpg']) {
    const request = { uri, method: 'GET', headers: {} };
    assert.equal(handler({ request }), request);
  }
});
