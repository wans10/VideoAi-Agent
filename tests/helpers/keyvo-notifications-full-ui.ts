// Test-only: importing this module first reopens the Notifications settings tab (KEYVO_NOTIFICATIONS_FULL_UI=1) for tests
// that pin it. Keyvo hides the tab in production (KEYVO_NOTIFICATIONS_TAB_HIDDEN); the switch is never set there.
process.env.KEYVO_NOTIFICATIONS_FULL_UI = '1';
