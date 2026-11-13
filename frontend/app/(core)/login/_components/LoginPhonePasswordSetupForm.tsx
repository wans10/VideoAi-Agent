'use client';

import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AuthCopy } from '../_lib/login-copy';
import type { LoginPhoneAuthState } from '../_hooks/useLoginPhoneAuth';
import { LoginPasswordField } from './LoginPasswordField';

type LoginPhonePasswordSetupFormProps = {
  authCopy: AuthCopy;
  phone: LoginPhoneAuthState;
  isAuthReady: boolean;
};

/** Required password step after a verified SMS code. Nothing else in the app is reachable until it is saved. */
export function LoginPhonePasswordSetupForm({ authCopy, phone, isAuthReady }: LoginPhonePasswordSetupFormProps) {
  const copy = authCopy.phone.passwordSetup;
  const setup = phone.setup;
  const passwordError = setup.errors.password ? authCopy.validation[setup.errors.password] : undefined;
  const confirmError = setup.errors.confirm ? authCopy.validation[setup.errors.confirm] : undefined;
  const disabled = !isAuthReady || setup.isSaving;

  return (
    <form method="post" noValidate onSubmit={setup.onSetupSubmit} className="stack-gap-sm" data-testid="phone-password-setup-form">
      <p className="text-xs text-text-muted">{copy.hint}</p>
      <LoginPasswordField
        authCopy={authCopy}
        inputId="auth-new-password"
        errorId="auth-new-password-error"
        errorMessage={passwordError}
        label={authCopy.fields.password}
        ref={setup.passwordRef}
        name="new-password"
        required
        disabled={setup.isSaving}
        value={setup.password}
        onChange={(event) => setup.onPasswordChange(event.target.value)}
        placeholder={authCopy.placeholders.passwordNew}
        autoComplete="new-password"
      />
      <LoginPasswordField
        authCopy={authCopy}
        inputId="auth-new-password-confirm"
        errorId="auth-new-password-confirm-error"
        errorMessage={confirmError}
        label={authCopy.fields.confirmPassword}
        ref={setup.confirmRef}
        name="new-password-confirm"
        required
        disabled={setup.isSaving}
        value={setup.confirm}
        onChange={(event) => setup.onConfirmChange(event.target.value)}
        placeholder={authCopy.placeholders.passwordNew}
        autoComplete="new-password"
      />
      <Button
        type="submit"
        disabled={disabled}
        aria-busy={setup.isSaving}
        variant="primary"
        className="w-full gap-2"
      >
        {setup.isSaving ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
        {copy.submit}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="phone-password-setup-cancel"
        disabled={setup.isSaving}
        onClick={() => void setup.onCancelSetup()}
        className="self-start text-xs text-text-secondary hover:text-text-primary"
      >
        {copy.cancel}
      </Button>
    </form>
  );
}
