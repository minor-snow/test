// Sample service — order processing module
import type { User } from "./user.js";

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered";
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function createOrder(user: User, items: OrderItem[]): Order {
  return {
    id: crypto.randomUUID(),
    userId: user.id,
    items,
    total: calculateTotal(items),
    status: "pending",
  };
}
