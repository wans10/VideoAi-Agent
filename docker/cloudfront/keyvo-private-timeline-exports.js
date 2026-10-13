// Viewer-request guard: account downloads use authenticated application delivery
// and S3 presigned URLs. Never serve private timeline artifacts via public CDN.
function handler(event) {
  var request = event.request;
  var path;
  try { path = decodeURIComponent(request.uri); } catch (_) {
    return { statusCode: 400, statusDescription: 'Bad Request' };
  }
  if (/^\/timeline-exports(?:\/|$)/i.test(path)) {
    return {
      statusCode: 403,
      statusDescription: 'Forbidden',
      headers: {
        'cache-control': { value: 'private, no-store' },
        'referrer-policy': { value: 'no-referrer' }
      }
    };
  }
  return request;
}
