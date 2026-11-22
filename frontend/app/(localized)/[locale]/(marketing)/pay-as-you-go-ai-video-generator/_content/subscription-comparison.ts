import type { PaygHeaderCopy } from './types';

/** Authored platform-comparison copy and contextual destinations, without pricing logic. The competitor and budget links are optional: a locale without them (zh) renders no link row. */
export type PaygSubscriptionComparison = {
  header: PaygHeaderCopy;
  higgsfieldLinkLabel?: string;
  openartLinkLabel?: string;
  budgetLink?: { label: string; slug: string };
  columns: [string, string, string];
  rows: Array<{ label: string; payg: string; subscription: string }>;
};
