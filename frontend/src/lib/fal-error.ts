export type FalGenerationPhase = 'pre_submission' | 'submission_rejected' | 'submission_unknown' | 'accepted' | 'provider_terminal';

export class FalGenerationError extends Error {
  status?: number;
  body?: unknown;
  providerJobId?: string;
  phase?: FalGenerationPhase;
  code?: string;

  constructor(
    message: string,
    options: { status?: number; body?: unknown; providerJobId?: string; cause?: unknown; phase?: FalGenerationPhase; code?: string } = {}
  ) {
    super(message);
    this.name = 'FalGenerationError';
    this.status = options.status;
    this.body = options.body;
    this.providerJobId = options.providerJobId;
    this.phase = options.phase;
    this.code = options.code;
    if (options.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

// Only throw before any provider network submission. Unknown network failures
// must keep their recoverable, non-refunding behavior.
export class FalPreSubmissionError extends FalGenerationError {
  constructor(message: string, options: ConstructorParameters<typeof FalGenerationError>[1] = {}) {
    super(message, { phase: 'pre_submission', ...options });
    this.name = 'FalPreSubmissionError';
  }
}
