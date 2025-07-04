import { ApiResponse } from '../types';

export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> => {
  return {
    success,
    data,
    message,
    error
  };
};

export const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => {
  return createApiResponse(true, data, message);
};

export const createErrorResponse = (error: string, message?: string): ApiResponse => {
  return createApiResponse(false, undefined, message, error);
};

export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};