'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AuthCopy, AuthMode } from '../_lib/login-copy';
import { formatTemplate } from '../_lib/login-helpers';
import { PHONE_OTP_LENGTH } from '../_lib/login-phone';
import type { LoginPhoneAuthState, PhoneFieldError } from '../_hooks/useLoginPhoneAuth';
import { LoginPhoneNumberField } from './LoginPhoneNumberField';

type LoginPhoneAuthPanelProps = {
  authCopy: AuthCopy;
  mode: Exclude<AuthMode, 'reset'>;
  phone: LoginPhoneAuthState;
  isAuthReady: boolean;
  legalMinAge: number;
  termsStatement: ReactNode;
  /** 注册 tab footer: switches to the 登录 tab. */
  onSwitchToSignIn: () => void;
};

/**
 * SMS code step. mode 'signup' is the 注册 tab (registration, footer link to 登录); mode 'signin' is the
 * forgot-password recovery view (back link to password sign-in). Both keep the terms and age checkboxes:
 * a number that has no account yet creates one.
 */
export function LoginPhoneAuthPanel({ authCopy, mode, phone, isAuthReady, legalMinAge, termsStatement, onSwitchToSignIn }: LoginPhoneAuthPanelProps) {
  const isSignup = mode === 'signup';
  const copy = authCopy.phone;
  const message = (field: PhoneFieldError) => {
    if (phone.fieldError !== field) return undefined;
    if (field === 'termsRequired' || field === 'ageRequired') return authCopy.validation[field];
    return copy.validation[field];
  };
  const phoneError = message('phoneRequired') ?? message('phoneInvalid');
  const codeError = message('codeRequired');
  const contactEmailError = phone.contact.error ? copy.validation[phone.contact.error] : undefined;
  const termsError = message('termsRequired');
  const ageError = message('ageRequired');
  const codeSent = Boolean(phone.codeSentTo);
  const coolingDown = phone.cooldownSeconds > 0;
  const resendLabel = coolingDown
    ? formatTemplate(copy.actions.resendIn, { seconds: String(phone.cooldownSeconds) })
    : codeSent ? copy.actions.resend : copy.actions.send;
  const disabled = !isAuthReady || phone.isBusy;

  return (
    <form method="post" noValidate onSubmit={phone.onVerifySubmit} className="stack-gap-sm" data-testid="phone-auth-form">
      <LoginPhoneNumberField
        label={copy.fields.phone}
        hint={copy.hint}
        placeholder={copy.placeholders.phone}
        inputRef={phone.phoneRef}
        value={phone.phone}
        error={phoneError}
        readOnly={codeSent}
        disabled={phone.isBusy}
        onChange={phone.onPhoneChange}
      />

      {isSignup ? (
        <div className="block text-sm">
          <label htmlFor="auth-contact-email" className="mb-1 block text-text-secondary">
            {copy.fields.contactEmail}
          </label>
          <Input
            id="auth-contact-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            name="contactEmail"
            maxLength={254}
            required
            ref={phone.contact.emailRef}
            value={phone.contact.email}
            disabled={phone.isBusy}
            onChange={(event) => phone.contact.onEmailChange(event.target.value)}
            placeholder={copy.placeholders.contactEmail}
            aria-invalid={Boolean(contactEmailError)}
            aria-describedby={contactEmailError ? 'auth-contact-email-error' : undefined}
          />
          {contactEmailError ? (
            <p id="auth-contact-email-error" className="mt-1 text-xs text-state-warning">
              {contactEmailError}
            </p>
          ) : null}
        </div>
      ) : null}

      {codeSent ? (
        <div className="block text-sm">
          <label htmlFor="auth-otp" className="mb-1 block text-text-secondary">
            {copy.fields.code}
          </label>
          <Input
            id="auth-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            name="otp"
            pattern={`\\d{${PHONE_OTP_LENGTH}}`}
            maxLength={PHONE_OTP_LENGTH}
            required
            ref={phone.codeRef}
            value={phone.code}
            disabled={phone.isBusy || phone.attemptsLeft <= 0}
            onChange={(event) => phone.onCodeChange(event.target.value)}
            className="min-h-11 tracking-[0.3em]"
            placeholder={copy.placeholders.code}
            aria-invalid={Boolean(codeError)}
            aria-describedby={codeError ? 'auth-otp-error' : undefined}
          />
          {codeError ? (
            <p id="auth-otp-error" className="mt-1 text-xs text-state-warning">
              {codeError}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="phone-resend"
              disabled={disabled || coolingDown}
              onClick={() => void phone.onSendCode()}
              className="text-brand hover:text-brandHover"
            >
              {resendLabel}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={phone.isBusy} onClick={phone.onChangePhone}>
              {copy.actions.changePhone}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="stack-gap-sm rounded-card bg-bg p-3 text-sm text-text-secondary">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            ref={phone.termsRef}
            checked={phone.acceptTerms}
            onChange={(event) => phone.onAcceptTermsChange(event.target.checked)}
            className={clsx(
              'mt-0.5 h-4 min-h-0 w-4 rounded border-border text-brand focus:ring-ring',
              termsError && 'border-state-warning text-state-warning focus:ring-state-warning'
            )}
            aria-invalid={Boolean(termsError)}
            aria-describedby={termsError ? 'auth-phone-terms-error' : undefined}
            required
          />
          <span className={clsx(termsError && 'text-state-warning')}>{termsStatement}</span>
        </label>
        {termsError ? (
          <p id="auth-phone-terms-error" className="pl-6 text-xs text-state-warning">
            {termsError}
          </p>
        ) : null}
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            ref={phone.ageRef}
            checked={phone.ageConfirmed}
            onChange={(event) => phone.onAgeConfirmedChange(event.target.checked)}
            className={clsx(
              'mt-0.5 h-4 min-h-0 w-4 rounded border-border text-brand focus:ring-ring',
              ageError && 'border-state-warning text-state-warning focus:ring-state-warning'
            )}
            aria-invalid={Boolean(ageError)}
            aria-describedby={ageError ? 'auth-phone-age-error' : undefined}
            required
          />
          <span>{formatTemplate(authCopy.terms.age, { age: String(legalMinAge) })}</span>
        </label>
        {ageError ? (
          <p id="auth-phone-age-error" className="pl-6 text-xs text-state-warning">
            {ageError}
          </p>
        ) : null}
        {isSignup ? (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={phone.contact.marketingOptIn}
              onChange={(event) => phone.contact.setMarketingOptIn(event.target.checked)}
              className="mt-0.5 h-4 min-h-0 w-4 rounded border-border text-brand focus:ring-ring"
            />
            <span>{authCopy.terms.marketing}</span>
          </label>
        ) : null}
      </div>

      {isSignup ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="phone-back-to-password"
          disabled={phone.isBusy}
          onClick={phone.onBackToPasswordSignIn}
          className="self-start text-xs text-text-secondary hover:text-text-primary"
        >
          <span aria-hidden>←</span>
          <span>{copy.backToPassword}</span>
        </Button>
      )}

      <Button
        type="submit"
        disabled={disabled || (!codeSent && coolingDown) || (codeSent && phone.attemptsLeft <= 0)}
        aria-busy={phone.isBusy}
        variant={isSignup ? 'primary' : 'outline'}
        className="w-full gap-2"
      >
        {phone.isBusy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
        {codeSent ? (isSignup ? copy.actions.verifySignup : copy.actions.verifySignin) : resendLabel}
      </Button>

      {isSignup ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="phone-switch-to-signin"
          disabled={phone.isBusy}
          onClick={onSwitchToSignIn}
          className="self-center text-xs text-text-secondary hover:text-text-primary"
        >
          {copy.signup.haveAccount}
        </Button>
      ) : null}
    </form>
  );
}
