import { AppError } from "./AppError";

export function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(400, `Missing route parameter: ${name}`);
  }
  return value;
}
