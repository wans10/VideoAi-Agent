# Private timeline export CDN remediation

Observed 2026-10-13: S3 anonymous HEAD returns 403, but the same completed private timeline export's CloudFront URL returns 200. Distribution `E2XD88PF0IQHZV` has only a default `*` behavior, viewer access unrestricted and no function associations. Origin access control does not establish viewer authorization.

Candidate: `docker/cloudfront/keyvo-private-timeline-exports.js`, viewer-request function `keyvo-private-timeline-exports`, runtime 2.0. Reject `/timeline-exports/` requests before cache lookup. Application-owned download routes continue to issue S3 presigned access; leave other public media paths unchanged. This addresses timeline export objects only; it does not certify privacy of all other media namespaces.

Before activation: confirm an owned application download uses the presigned S3 hostname, preserve current distribution configuration, publish the tested function, and associate the LIVE function with the default behavior's viewer-request event. Verify anonymous GET/HEAD/Range all return 403, an owned signed S3 download still returns 200/206, and approved public demos still load. Then test real browser delivery. Rollback removes only this function association; do not delete the distribution or modify the origin.

Do not enable the production conversation export flag until the CNY protocol fix is deployed, this access check passes, and the browser confirmation/download flow is accepted. Do not treat development-function tests as production enforcement.

Activated and verified: LIVE function associated with Default (*) viewer-request on 2026-10-13. Anonymous HEAD and Range GET return 403; owned presigned S3 Range GET returns 206 with 1024 bytes. AWS development tests also preserve `/public/demo.mp4` unchanged. Full browser/public-example smoke remains to be completed.
