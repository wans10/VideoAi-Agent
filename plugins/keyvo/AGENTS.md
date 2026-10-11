# Keyvo candidate package

Read ../maxvideoai/AGENTS.md and the root MCP client experience guide. Preserve
upstream source and its independent archive inventory. This derivative retains
`maxvideoai` protocol/dependency IDs but must connect exclusively to Keyvo.

Build with `node scripts/build-maxvideoai-plugin-release.mjs --profile keyvo
--source plugins/keyvo --out <dedicated-output>` from the repository root. Run
`tests/keyvo-plugin-package.test.ts` and `pnpm mcp:client:check` after changes.
Do not copy upstream display assets or host certification. Package validation,
client installation, OAuth authentication and actual execution are separate.
Keep LICENSE and attribution intact; record changes in NOTICE. The maintainer
file is excluded from the customer archive. Do not publish a tag or marketplace
entry as part of package-only acceptance.
