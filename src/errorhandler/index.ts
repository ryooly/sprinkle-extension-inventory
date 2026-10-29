export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public errors?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
