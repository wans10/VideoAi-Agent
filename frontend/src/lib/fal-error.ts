export class FalGenerationError extends Error {
  status?: number;
  body?: unknown;
  providerJobId?: string;

  constructor(
    message: string,
    options: { status?: number; body?: unknown; providerJobId?: string; cause?: unknown } = {}
  ) {
    super(message);
    this.name = 'FalGenerationError';
    this.status = options.status;
    this.body = options.body;
    this.providerJobId = options.providerJobId;
    if (options.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

// Only throw before any provider network submission. Unknown network failures
// must keep their recoverable, non-refunding behavior.
export class FalPreSubmissionError extends FalGenerationError {
  constructor(message: string) {
    super(message);
    this.name = 'FalPreSubmissionError';
  }
}
