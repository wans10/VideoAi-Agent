import type { AuthMode } from './login-copy';

export type AuthFieldName =
  | 'email'
  | 'password'
  | 'confirm'
  | 'acceptTerms'
  | 'ageConfirmed';

export type AuthValidationErrorCode =
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'confirmRequired'
  | 'passwordMismatch'
  | 'termsRequired'
  | 'ageRequired';

export type AuthFieldErrors = Partial<Record<AuthFieldName, AuthValidationErrorCode>>;

export type AuthValidationInput = {
  mode: AuthMode;
  email: string;
  password: string;
  confirm: string;
  acceptTerms: boolean;
  ageConfirmed: boolean;
};

export type AuthValidationResult = {
  errors: AuthFieldErrors;
  firstInvalidField: AuthFieldName | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
/** Minimum password length for every password we accept (email sign-up and phone password setup). */
export const AUTH_PASSWORD_MIN_LENGTH = 6;
const SIGNUP_FIELD_ORDER: AuthFieldName[] = [
  'email',
  'password',
  'confirm',
  'acceptTerms',
  'ageConfirmed',
];

export function validateAuthForm(input: AuthValidationInput): AuthValidationResult {
  const errors: AuthFieldErrors = {};
  const email = input.email.trim();

  if (!email) errors.email = 'emailRequired';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'emailInvalid';

  if (input.mode !== 'reset') {
    if (!input.password) errors.password = 'passwordRequired';
    else if (input.mode === 'signup' && input.password.length < AUTH_PASSWORD_MIN_LENGTH) {
      errors.password = 'passwordTooShort';
    }
  }

  if (input.mode === 'signup') {
    if (!input.confirm) errors.confirm = 'confirmRequired';
    else if (input.password !== input.confirm) errors.confirm = 'passwordMismatch';
    if (!input.acceptTerms) errors.acceptTerms = 'termsRequired';
    if (!input.ageConfirmed) errors.ageConfirmed = 'ageRequired';
  }

  const order: AuthFieldName[] =
    input.mode === 'reset'
      ? ['email']
      : input.mode === 'signin'
        ? ['email', 'password']
        : SIGNUP_FIELD_ORDER;

  return {
    errors,
    firstInvalidField: order.find((field) => errors[field]) ?? null,
  };
}

export type PasswordSetupInput = { password: string; confirm: string };

/** Phone password setup: the same length rule and messages as email sign-up. */
export function validatePasswordSetup(input: PasswordSetupInput): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!input.password) errors.password = 'passwordRequired';
  else if (input.password.length < AUTH_PASSWORD_MIN_LENGTH) errors.password = 'passwordTooShort';
  if (!input.confirm) errors.confirm = 'confirmRequired';
  else if (input.password !== input.confirm) errors.confirm = 'passwordMismatch';
  return errors;
}
