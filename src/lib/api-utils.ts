import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  message: string,
  status = 500,
  code?: string,
  retryable = false
) {
  return NextResponse.json(
    { success: false, error: message, code, retryable },
    { status }
  );
}

/**
 * Determines if an error is retryable based on its message
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('connection') ||
      msg.includes('temporarily') ||
      msg.includes('econnreset') ||
      msg.includes('econnrefused')
    );
  }
  return false;
}

/**
 * Maps error to appropriate HTTP status code
 */
function getErrorStatus(error: unknown): number {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('not found')) return 404;
    if (msg.includes('unauthorized') || msg.includes('forbidden')) return 403;
    if (msg.includes('invalid')) return 400;
    if (msg.includes('timeout')) return 504;
    if (msg.includes('rate limit')) return 429;
  }
  return 500;
}

/**
 * Maps error to appropriate error code
 */
function getErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout')) return 'TIMEOUT';
    if (msg.includes('not found')) return 'NOT_FOUND';
    if (msg.includes('unauthorized')) return 'UNAUTHORIZED';
    if (msg.includes('forbidden')) return 'FORBIDDEN';
    if (msg.includes('invalid')) return 'INVALID_REQUEST';
    if (msg.includes('rate limit')) return 'RATE_LIMITED';
    if (msg.includes('network') || msg.includes('connection')) return 'NETWORK_ERROR';
  }
  return 'INTERNAL_ERROR';
}

export function handleApiError(error: unknown, context: string) {
  console.error(`${context}:`, error);

  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const retryable = isRetryableError(error);
  const status = getErrorStatus(error);
  const code = getErrorCode(error);

  return errorResponse(message, status, code, retryable);
}
