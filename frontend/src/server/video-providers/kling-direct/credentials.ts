/** True when Kling credentials exist: an API Key, or the Access Key and Secret Key pair. */
export function hasKlingCredentials(env: {
  KLING_API_KEY?: string | undefined;
  KLING_ACCESS_KEY?: string | undefined;
  KLING_SECRET_KEY?: string | undefined;
}): boolean {
  const set = (value: string | undefined) => Boolean(value?.trim());
  return set(env.KLING_API_KEY) || (set(env.KLING_ACCESS_KEY) && set(env.KLING_SECRET_KEY));
}
