export function shouldFallbackImageDirectSubmit(params: {
  provider: 'google_vertex_image' | 'byteplus_modelark';
  providerJobId: string | null;
  status: number | null;
  fallbackAvailable: boolean;
}): boolean {
  if (!params.fallbackAvailable || params.providerJobId) return false;
  const rejectedStatuses = params.provider === 'google_vertex_image'
    ? [429, 503]
    : [401, 403, 404, 429, 503];
  return rejectedStatuses.includes(params.status ?? 0);
}
