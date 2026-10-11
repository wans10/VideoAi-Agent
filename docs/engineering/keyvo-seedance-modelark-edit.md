# Keyvo Seedance 2.5 ModelArk edit routing

2026-10-11: the Keyvo operator authorized using the configured Volcengine ModelArk
endpoint for Seedance 2.5 video editing. Set
`SEEDANCE_2_5_V2V_TRANSPORT=modelark` and include `v2v` in
`SEEDANCE_2_5_BYTEPLUS_MODES` after deploying the candidate image. The default
remains `las` for existing deployments. Invalid transport values fail before
submission rather than selecting an arbitrary provider.

New edits use the existing ModelArk video-reference payload and the configured
`BYTEPLUS_ARK_API_KEY`/base URL. Output/input pricing, account ownership, one-attempt
submission and durable output logic are unchanged. Stored `byteplusTransport`
continues to own polling; historical LAS jobs are never moved to ModelArk.

The executable regression verifies the actual HTTP client target and reference
payload with a fixture. This is not supplier acceptance evidence. A bounded live
edit canary still needs an authorized private source video and budget. Enabling
the route does not prove that the account has access to every editing mode.

Happy Horse 1.0 is outside the authored Alibaba direct mapping. The existing
Happy Horse 1.1 model IDs and payloads cannot establish support for 1.0. Require
an account-confirmed 1.0 endpoint/model ID and its parameter contract before
adding a separate direct adapter. Never silently run 1.1 under a 1.0 label.
