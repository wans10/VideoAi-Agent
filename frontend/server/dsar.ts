import { query } from '@/lib/db';
import { getWalletBalancesByCurrency } from '@/lib/wallet';
import { getProfileSnapshot, type ProfileSnapshot } from '@/server/profile';
import { getUserIdentity } from '@/server/supabase-admin';

type PreferenceRow = {
  default_share_public: boolean;
  default_allow_index: boolean;
  onboarding_done: boolean;
  updated_at: Date | null;
};

/** Customer-facing ledger fields only: no vendor accounts, fee splits or pricing internals. */
type ReceiptRow = {
  id: string;
  type: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  job_id: string | null;
  created_at: Date;
};

type JobRow = {
  job_id: string;
  surface: string | null;
  engine_label: string | null;
  duration_sec: number | null;
  aspect_ratio: string | null;
  prompt: string | null;
  status: string | null;
  final_price_cents: number | null;
  currency: string | null;
  thumb_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  created_at: Date;
};

type MediaAssetRow = {
  id: string;
  kind: string | null;
  url: string | null;
  thumb_url: string | null;
  mime_type: string | null;
  size_bytes: string | number | null;
  source: string | null;
  metadata_name: string | null;
  created_at: Date;
};

type ConsentRow = {
  doc_key: string;
  doc_version: string;
  accepted: boolean;
  accepted_at: Date;
  ip: string | null;
  user_agent: string | null;
  locale: string | null;
  source: string | null;
};

export type DsraExportPayload = {
  generatedAt: string;
  user: {
    id: string;
    email: string | null;
    /** The account's own phone number (phone sign-up); exported unmasked to its owner. */
    phone: string | null;
    fullName: string | null;
    profile: ReturnType<typeof mapProfile> | null;
    preferences: PreferenceRow | null;
  };
  receipts: ReceiptRow[];
  consents: ConsentRow[];
  wallet: {
    balances: Array<{ currency: string | null; balanceCents: number }>;
    receiptCount: number;
  };
  jobs: JobRow[];
  mediaAssets: MediaAssetRow[];
  /** Lists are capped; `truncated` names any list that has more rows than were exported. */
  limits: { maxRows: number; truncated: string[] };
};

export const DSAR_MAX_ROWS = 2000;

function mapProfile(profile: ProfileSnapshot | null): {
  marketingOptIn: boolean | null;
  marketingOptInAt: string | null;
  tosVersion: string | null;
  privacyVersion: string | null;
  cookiesVersion: string | null;
  ageVerified: boolean | null;
  markedForDeletionAt: string | null;
} {
  if (!profile) {
    return {
      marketingOptIn: null,
      marketingOptInAt: null,
      tosVersion: null,
      privacyVersion: null,
      cookiesVersion: null,
      ageVerified: null,
      markedForDeletionAt: null,
    };
  }
  return {
    marketingOptIn: profile.marketingOptIn ?? null,
    marketingOptInAt: profile.marketingOptInAt ? profile.marketingOptInAt.toISOString() : null,
    tosVersion: profile.tosVersion ?? null,
    privacyVersion: profile.privacyVersion ?? null,
    cookiesVersion: profile.cookiesVersion ?? null,
    ageVerified: profile.ageVerified ?? null,
    markedForDeletionAt: profile.markedForDeletionAt ? profile.markedForDeletionAt.toISOString() : null,
  };
}

export async function buildDsarPayload(userId: string): Promise<DsraExportPayload> {
  const cap = DSAR_MAX_ROWS + 1;
  const [profile, preferencesRows, receipts, consents, identity, balances, jobs, mediaAssets] = await Promise.all([
    getProfileSnapshot(userId),
    query<PreferenceRow>(
      `SELECT default_share_public, default_allow_index, onboarding_done, updated_at
       FROM user_preferences
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    ),
    query<ReceiptRow>(
      `SELECT id, type, amount_cents, currency, description, job_id, created_at
       FROM app_receipts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT ${cap}`,
      [userId]
    ),
    query<ConsentRow>(
      `SELECT doc_key, doc_version, accepted, accepted_at, ip::text, user_agent, locale, source
       FROM user_consents
       WHERE user_id = $1
       ORDER BY accepted_at DESC
       LIMIT ${cap}`,
      [userId]
    ),
    getUserIdentity(userId),
    getWalletBalancesByCurrency(userId).catch(() => []),
    query<JobRow>(
      `SELECT job_id, surface, engine_label, duration_sec, aspect_ratio, prompt, status, final_price_cents,
              currency, thumb_url, video_url, audio_url, created_at
       FROM app_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT ${cap}`,
      [userId]
    ).catch(() => [] as JobRow[]),
    query<MediaAssetRow>(
      `SELECT id, kind, url, thumb_url, mime_type, size_bytes, source,
              COALESCE(metadata->>'name', metadata->>'fileName', metadata->>'filename') AS metadata_name, created_at
       FROM media_assets
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ${cap}`,
      [userId]
    ).catch(() => [] as MediaAssetRow[]),
  ]);

  const truncated: string[] = [];
  const bound = <T,>(name: string, rows: T[]): T[] => {
    if (rows.length > DSAR_MAX_ROWS) {
      truncated.push(name);
      return rows.slice(0, DSAR_MAX_ROWS);
    }
    return rows;
  };
  const boundedReceipts = bound('receipts', receipts);

  return {
    generatedAt: new Date().toISOString(),
    user: {
      id: userId,
      email: identity?.email ?? null,
      phone: identity?.phone ?? null,
      fullName: identity?.fullName ?? null,
      profile: mapProfile(profile),
      preferences: preferencesRows[0] ?? null,
    },
    receipts: boundedReceipts,
    consents: bound('consents', consents),
    wallet: {
      balances: balances.map((entry) => ({ currency: entry.currency, balanceCents: entry.balanceCents })),
      receiptCount: boundedReceipts.length,
    },
    jobs: bound('jobs', jobs),
    mediaAssets: bound('mediaAssets', mediaAssets),
    limits: { maxRows: DSAR_MAX_ROWS, truncated },
  };
}
