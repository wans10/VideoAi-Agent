'use client';

import type { ChangeEvent, Ref } from 'react';
import clsx from 'clsx';
import { Input } from '@/components/ui/Input';
import { PHONE_COUNTRY_CODE } from '../_lib/login-phone';

type LoginPhoneNumberFieldProps = {
  label: string;
  /** Shown under the field on the registration and recovery steps; sign-in omits it. */
  hint?: string;
  placeholder: string;
  inputRef: Ref<HTMLInputElement>;
  value: string;
  error?: string;
  readOnly?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
};

/** Mainland mobile number with the fixed +86 prefix. Shared by phone sign-in and the SMS code step. */
export function LoginPhoneNumberField({
  label,
  hint,
  placeholder,
  inputRef,
  value,
  error,
  readOnly = false,
  disabled = false,
  onChange,
}: LoginPhoneNumberFieldProps) {
  return (
    <div className="block text-sm">
      <label htmlFor="auth-phone" className="mb-1 block text-text-secondary">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <span
          aria-hidden="true"
          className="inline-flex min-h-11 items-center rounded-input border border-hairline bg-bg px-3 text-sm text-text-secondary"
        >
          {PHONE_COUNTRY_CODE}
        </span>
        <Input
          id="auth-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          name="phone"
          required
          ref={inputRef}
          value={value}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          className="min-h-11"
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={clsx(hint && 'auth-phone-hint', error && 'auth-phone-error') || undefined}
        />
      </div>
      {hint ? (
        <p id="auth-phone-hint" className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id="auth-phone-error" className="mt-1 text-xs text-state-warning">
          {error}
        </p>
      ) : null}
    </div>
  );
}
