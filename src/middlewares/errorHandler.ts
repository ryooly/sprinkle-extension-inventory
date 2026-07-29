export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public errors?: unknown
  ) {
    super(message)
    this.name = "AppError"
  }
}

function isPostgresError(error: unknown): error is { code: string; message: string } {
  return typeof error === "object" && error !== null && "code" in error
}
