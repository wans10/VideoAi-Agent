/**
 * Default public host of the configured storage bucket when no S3_PUBLIC_BASE_URL is set.
 * AWS S3 uses `<bucket>.s3[.<region>].amazonaws.com`; an S3-compatible service such as Aliyun OSS
 * (S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com) uses `<bucket>.<endpoint host>`.
 */
export function defaultStorageHost(env: {
  bucket?: string | null;
  region?: string | null;
  endpoint?: string | null;
}): string | null {
  const bucket = env.bucket?.trim();
  if (!bucket) return null;
  const endpoint = env.endpoint?.trim();
  if (endpoint) {
    try {
      return `${bucket}.${new URL(endpoint).host}`;
    } catch {
      // An invalid endpoint falls back to the AWS naming below.
    }
  }
  const region = env.region?.trim();
  return region ? `${bucket}.s3.${region}.amazonaws.com` : `${bucket}.s3.amazonaws.com`;
}

export function defaultStorageHostFromEnv(): string | null {
  return defaultStorageHost({
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
  });
}
