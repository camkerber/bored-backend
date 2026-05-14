export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}
