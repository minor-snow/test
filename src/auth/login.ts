import { authenticate } from "../utils/format.js";

export function login(username: string, password: string): boolean {
  return authenticate(username.trim(), password);
}
