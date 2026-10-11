# Keyvo Seedance 2.5 ModelArk edit routing

2026-10-11: the Keyvo operator authorized using the configured Volcengine ModelArk
endpoint for Seedance 2.5 video editing. Set
`SEEDANCE_2_5_V2V_TRANSPORT=modelark` and include `v2v` in
`SEEDANCE_2_5_BYTEPLUS_MODES` after deploying the candidate image. The default
remains `las` for existing deployments. Invalid transport values fail before
submission rather than selecting an arbitrary provider.

The official Volcengine Seedance 2.5 API uses the configured
`BYTEPLUS_ARK_API_KEY`/base URL for edits; separate LAS credentials are not an
official prerequisite. LAS is a historical project transport.

The October 11 official-contract correction explicitly sends `ratio=adaptive`
for I2V, V2V and extension. V2V sends `duration=-1`; reference generation, editing
and extension send `omni_reference_task_type=reference`, `edit` and `extend`
respectively. Account-specific model endpoint IDs receive the same policy through
an explicit Seedance 2.5 flag. Draft I2V also receives adaptive ratio.

Edits require an owned, verified 4–30 second source. Customer quotes, confirmation
and initial job timing use its duration rounded upward to the existing integer
customer tariff cell. The -1 provider sentinel never enters pricing or storage.
This preserves authored rates while fixing the previous caller-duration mismatch;
actual output metadata and provider usage remain independently measured.
Account ownership, one-attempt submission and durable output logic are unchanged. Stored `byteplusTransport`
continues to own polling; historical LAS jobs are never moved to ModelArk.

The executable regression verifies the actual HTTP client target and reference
payload with a fixture. This is not supplier acceptance evidence. A bounded live
edit canary still needs an authorized private source video and budget. Enabling
the route does not prove that the account has access to every editing mode.

Happy Horse 1.0 is outside the authored Alibaba direct mapping. The existing
Happy Horse 1.1 model IDs and payloads cannot establish support for 1.0. Require
an account-confirmed 1.0 endpoint/model ID and its parameter contract before
adding a separate direct adapter. Never silently run 1.1 under a 1.0 label.

The supplied official documentation also allows larger video uploads and additional
image formats than this application's conservative limits. Those omissions are
product restrictions, not provider capabilities; this change does not expand upload
limits or promise unsupported formats. Free-form automatic output duration remains
unexposed outside source-preserving editing because current quotes require bounded
integer output cells. Model task type still depends on prompt intent; an explicit
field cannot guarantee that the supplier will accept a contradictory prompt.
