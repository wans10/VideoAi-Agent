# LLM Hub output validation and rollback fixes — 2026-10-08

The three findings from the systematic audit are addressed in the shared GPT Image 2.5 output owner.

1. All Base64 outputs are fully decoded with Sharp (failOn warning, bounded pixels) before any writes. PNG/JPEG format, page count and expected geometry are checked. Raw decoding verifies compressed pixels rather than trusting IHDR metadata. Original bytes are preserved.
2. Every image in the batch is checked before the first upload. Wrong geometry or truncated pixels result in zero uploads, including an invalid later batch member.
3. Newly allocated random object keys are registered through the existing storage beforeUpload hook, before PUT. Any later failure rolls back those exact keys, including a failed PUT whose response is ambiguous. No prefix scans or existing asset deletes occur. Incomplete deletes throw a distinct error containing remaining keys and the original cause; detail retains keys for the existing failure log owner. No generation POST retry is introduced.

Validation: 116 focused tests pass, including PNG truncation, zero writes for invalid later images, scoped rollback after partial failure/ambiguous PUT, cleanup failure evidence, JPEG and existing provider/quote/architecture contracts. Typecheck, focused lint, exposure and diff checks pass. Test PNG/JPEG fixtures are generated bitmap files at the real expected dimensions; old logo mocks were replaced because full decoding now checks actual geometry.

Storage outage can also prevent DELETE; exact remaining keys are reported, not silently claimed deleted. Abrupt process termination bypasses in-process rollback and still needs durable operational recovery. No production S3 deletion, paid remote generation or production deployment was performed for this fix. The prior Sunburst upstream timeout and unverified supplier billing limitations remain.
