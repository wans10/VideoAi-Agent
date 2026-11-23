// Keyvo withholds every customer link to a comparison route (KEYVO_COMPARE_HIDDEN). Upstream contracts that pin the
// comparison links themselves (labels, hrefs, canonical order) run with the test-only reopen. Never set in production.
process.env.KEYVO_COMPARE_FULL_UI = '1';
