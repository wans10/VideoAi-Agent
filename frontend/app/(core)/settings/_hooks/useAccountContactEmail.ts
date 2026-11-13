'use client';

import { useEffect, useState } from 'react';

/**
 * Loads the signed-in account's phone sign-up contact email (read-only in settings). Failures leave the
 * row hidden; the account's own login identity is never affected.
 */
export function useAccountContactEmail(enabled: boolean, userId: string | null | undefined): string | null {
  const [contactEmail, setContactEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;
    let active = true;
    // Deferred so an environment without fetch rejects here instead of throwing during render.
    Promise.resolve()
      .then(() => fetch('/api/account/contact-email', { credentials: 'include' }))
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { ok?: boolean; contactEmail?: unknown } | null) => {
        if (active && json?.ok && typeof json.contactEmail === 'string') setContactEmail(json.contactEmail);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [enabled, userId]);

  return contactEmail;
}
