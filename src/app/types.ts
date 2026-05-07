export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  customer: string;
  phone?: string;
  address?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCost: number;
  remise: number;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  date: string;
}

export interface User {
  id: string;
  username: string;
  role: "admin" | "worker";
}

export type Page = "newOrder" | "report";
