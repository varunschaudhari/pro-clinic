import { Response } from 'express';
import { IPaginatedResponse } from '../types';

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created<T>(res: Response, data: T, message = 'Created successfully') {
    return ApiResponse.success(res, data, message, 201);
  }

  static paginated<T>(
    res: Response,
    payload: IPaginatedResponse<T>,
    message = 'Success'
  ) {
    return res.status(200).json({
      success: true,
      message,
      data: payload.data,
      pagination: {
        total: payload.total,
        page: payload.page,
        limit: payload.limit,
        totalPages: payload.totalPages,
        hasNext: payload.hasNext,
        hasPrev: payload.hasPrev,
      },
    });
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}
