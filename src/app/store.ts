import { Order, User } from "./types";

const ORDERS_KEY = "genz2026_orders";
const USERS_KEY = "genz2026_users";
const SESSION_KEY = "genz2026_session";

export const defaultUsers: User[] = [
  { id: "1", username: "BienvenueSweetHome", role: "admin" },
  { id: "2", username: "BSHWorker", role: "worker" },
];

export const defaultOrders: Order[] = [];

export function loadOrders(): Order[] {
  if (typeof window === "undefined") return defaultOrders;
  const stored = localStorage.getItem(ORDERS_KEY);
  if (!stored) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(defaultOrders));
    return defaultOrders;
  }
  return JSON.parse(stored);
}

export function saveOrders(orders: Order[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function loadUsers(): User[] {
  if (typeof window === "undefined") return defaultUsers;
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  const users = JSON.parse(stored);
  // Migrate old users to new credentials
  const migrated = users.map((u: User) => {
    if (u.username === "admin") return { ...u, username: "BienvenueSweetHome" };
    if (u.username === "worker") return { ...u, username: "BSHWorker" };
    if (u.username === "BHS!") return { ...u, username: "BSHWorker" };
    return u;
  });
  if (JSON.stringify(migrated) !== JSON.stringify(users)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(migrated));
  }
  return migrated;
}

export function login(username: string, password: string): User | null {
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  // Simple password check - in production use proper hashing
  if (user && ((username === "BienvenueSweetHome" && password === "Bi!En123") || (username === "BSHWorker" && password === "Worker!@BSH"))) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }
  return null;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  return JSON.parse(stored);
}
