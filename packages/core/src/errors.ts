export type ErrorCode =
  | 'not_found'
  | 'unauthenticated'
  | 'forbidden'
  | 'invalid_input'
  | 'conflict'
  | 'internal'

export class AgentRoomsError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AgentRoomsError'
    this.code = code
  }
}

export class NotFoundError extends AgentRoomsError {
  constructor(message: string, options?: ErrorOptions) {
    super('not_found', message, options)
    this.name = 'NotFoundError'
  }
}

export class UnauthenticatedError extends AgentRoomsError {
  constructor(message: string, options?: ErrorOptions) {
    super('unauthenticated', message, options)
    this.name = 'UnauthenticatedError'
  }
}

export class ForbiddenError extends AgentRoomsError {
  constructor(message: string, options?: ErrorOptions) {
    super('forbidden', message, options)
    this.name = 'ForbiddenError'
  }
}

export class InvalidInputError extends AgentRoomsError {
  constructor(message: string, options?: ErrorOptions) {
    super('invalid_input', message, options)
    this.name = 'InvalidInputError'
  }
}

export class ConflictError extends AgentRoomsError {
  constructor(message: string, options?: ErrorOptions) {
    super('conflict', message, options)
    this.name = 'ConflictError'
  }
}

export function isAgentRoomsError(error: unknown): error is AgentRoomsError {
  return error instanceof AgentRoomsError
}
