import { Redis } from "@upstash/redis";

/**
 * Subscriber and alert storage using Upstash Redis.
 * Works on Vercel serverless — no filesystem needed.
 *
 * Keys:
 *   subscribers        — hash: subscriberId → Subscriber JSON
 *   sent-alerts        — hash: "subId:slotKey" → sentAt timestamp
 */

export type Subscriber = {
  id: string;
  email?: string;
  phone?: string;
  zipCode: string;
  maxDistance: number;
  service: string;
  active: boolean;
  createdAt: string;
};

export type SentAlert = {
  subscriberId: string;
  slotKey: string;
  sentAt: string;
};

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// ── Subscribers ──

export async function getSubscribers(): Promise<Subscriber[]> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[Storage] No Redis configured, returning empty");
    return [];
  }
  const all = await redis.hgetall<Record<string, Subscriber>>("subscribers");
  if (!all) return [];
  return Object.values(all);
}

export async function addSubscriber(sub: Subscriber): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[Storage] No Redis configured, cannot save subscriber");
    return;
  }
  await redis.hset("subscribers", { [sub.id]: sub });
}

export async function findDuplicateSubscriber(
  zipCode: string,
  email?: string,
  phone?: string
): Promise<Subscriber | undefined> {
  const subs = await getSubscribers();
  return subs.find(
    (s) =>
      s.active &&
      s.zipCode === zipCode &&
      ((email && s.email === email) || (phone && s.phone === phone))
  );
}

// ── Sent Alerts ──

export async function getSentAlerts(): Promise<SentAlert[]> {
  const redis = getRedis();
  if (!redis) return [];
  const all = await redis.hgetall<Record<string, string>>("sent-alerts");
  if (!all) return [];
  return Object.entries(all).map(([key, sentAt]) => {
    const [subscriberId, ...rest] = key.split(":");
    return { subscriberId, slotKey: rest.join(":"), sentAt };
  });
}

export async function saveSentAlerts(alerts: SentAlert[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  // Clear old and write new
  await redis.del("sent-alerts");
  if (alerts.length === 0) return;
  const entries: Record<string, string> = {};
  for (const a of alerts) {
    entries[`${a.subscriberId}:${a.slotKey}`] = a.sentAt;
  }
  await redis.hset("sent-alerts", entries);
}
