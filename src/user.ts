// Sample service — user management module
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createUser(name: string, email: string, role: User["role"] = "user"): User {
  if (!name || name.trim().length === 0) {
    throw new Error("Name cannot be empty");
  }
  if (!validateEmail(email)) {
    throw new Error(`Invalid email: ${email}`);
  }
  return {
    id: crypto.randomUUID(),
    name,
    email,
    role,
  };
}

export function isAdmin(user: User): boolean {
  return user.role === "admin";
}
