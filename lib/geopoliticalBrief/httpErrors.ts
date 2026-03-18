export type HttpError = {
  status: number;
  error: string;
  details?: unknown;
};

export function badRequest(error: string, details?: unknown): HttpError {
  return { status: 400, error, details };
}

