import type { InsufficientStockItem } from '../../shared/types';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
  }
}

export class InsufficientStockError extends AppError {
  public readonly details: InsufficientStockItem[];
  constructor(message: string, items: InsufficientStockItem[]) {
    super(message, 422, 'INSUFFICIENT_STOCK');
    this.details = items;
  }
}
