import { API_BASE } from "./constants";
import type { CreateOrderPayload, AuthResponse } from "./types";

export interface Trader {
  token: string;
  userId: string;
  email: string;
}

const users: Trader[] = [];

async function request(
  path: string,
  options: RequestInit & { token?: string } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function seedUser(name: string): Promise<Trader> {
  const email = `${name}@sim.io`;
  try {
    const signup = await request("/signup", {
      method: "POST",
      body: JSON.stringify({ email, name, password: "test123" }),
    }) as AuthResponse;

    await request("/onRamp", {
      method: "POST",
      body: JSON.stringify({ amount: 100000 }),
      token: signup.token,
    });

    return { token: signup.token, userId: signup.user.id, email };
  } catch (e) {
    // user may already exist, try signin then top up
    const signin = await request("/signin", {
      method: "POST",
      body: JSON.stringify({ email, password: "test123" }),
    }) as AuthResponse;

    // re-credit wallet in case engine restarted (balances are in-memory only)
    try {
      await request("/onRamp", {
        method: "POST",
        body: JSON.stringify({ amount: 100000 }),
        token: signin.token,
      });
    } catch {}

    return { token: signin.token, userId: signin.user.id, email };
  }
}

export async function seedTraders(names: string[]): Promise<Trader[]> {
  for (const name of names) {
    const trader = await seedUser(name);
    users.push(trader);
    console.log(`  ✓ ${name}`);
  }
  return users;
}

export function getTraders(): Trader[] {
  return users;
}

export function getRandomTrader(): Trader {
  return users[Math.floor(Math.random() * users.length)];
}

export { request };
