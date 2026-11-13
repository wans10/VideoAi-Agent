'use client';

import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AuthCopy } from '../_lib/login-copy';
import type { LoginPhoneAuthState } from '../_hooks/useLoginPhoneAuth';
import { LoginPasswordField } from './LoginPasswordField';
import { LoginPhoneNumberField } from './LoginPhoneNumberField';

type LoginPhoneSignInFormProps = {
  authCopy: AuthCopy;
  phone: LoginPhoneAuthState;
  isAuthReady: boolean;
};

/** Phone + password sign-in (the default phone form), with the SMS-code entrances for recovery and new numbers. */
export function LoginPhoneSignInForm({ authCopy, phone, isAuthReady }: LoginPhoneSignInFormProps) {
  const copy = authCopy.phone;
  const signIn = phone.signIn;
  const phoneError = phone.fieldError === 'phoneRequired' ? copy.validation.phoneRequired
    : phone.fieldError === 'phoneInvalid' ? copy.validation.phoneInvalid
      : undefined;
  const passwordError = signIn.passwordError ? authCopy.validation[signIn.passwordError] : undefined;
  const disabled = !isAuthReady || phone.isBusy;

  return (
    <form method="post" noValidate onSubmit={signIn.onSignInSubmit} className="stack-gap-sm" data-testid="phone-password-form">
      <LoginPhoneNumberField
        label={copy.fields.phone}
        hint={copy.hint}
        placeholder={copy.placeholders.phone}
        inputRef={phone.phoneRef}
        value={phone.phone}
        error={phoneError}
        disabled={phone.isBusy}
        onChange={phone.onPhoneChange}
      />
      <LoginPasswordField
        authCopy={authCopy}
        inputId="auth-phone-password"
        errorId="auth-phone-password-error"
        errorMessage={passwordError}
        label={authCopy.fields.password}
        ref={signIn.passwordRef}
        name="password"
        required
        disabled={phone.isBusy}
        value={signIn.password}
        onChange={(event) => signIn.onPasswordChange(event.target.value)}
        placeholder={authCopy.placeholders.password}
        autoComplete="current-password"
      />
      <Button
        type="submit"
        disabled={disabled}
        aria-busy={signIn.isSigningIn}
        variant="primary"
        className="w-full gap-2"
      >
        {signIn.isSigningIn ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
        {copy.passwordSignin.submit}
      </Button>
      <div className="flex flex-col gap-2 text-xs">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="phone-use-code"
          disabled={disabled}
          onClick={phone.onStartCodeLogin}
          className="self-start text-brand hover:text-brandHover"
        >
          {copy.passwordSignin.forgotPassword}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={phone.onStartCodeLogin}
          className="self-start text-text-secondary hover:text-text-primary"
        >
          {copy.passwordSignin.newUser}
        </Button>
      </div>
    </form>
  );
}
