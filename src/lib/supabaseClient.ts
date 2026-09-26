import { createClient } from "@supabase/supabase-js";
import { StatEvent, Game } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-d2l.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// BroadcastChannel for instant peer-to-peer sync between multiple open browser windows/tabs/devices
export const d2lSyncChannel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("d2l_realtime_sync_channel")
  : null;

export interface RealtimeSyncPayload {
  type: "STAT_EVENT_ADDED" | "STAT_EVENT_DELETED" | "GAME_CLOCK_UPDATED" | "SCORE_UPDATED" | "SUBSTITUTION";
  gameId: string;
  payload: unknown;
  senderStaffId: string;
  senderStaffName: string;
  timestamp: number;
}

export function broadcastD2LEvent(event: RealtimeSyncPayload) {
  if (d2lSyncChannel) {
    d2lSyncChannel.postMessage(event);
  }
}

// Local offline sync queue storage
const OFFLINE_QUEUE_KEY = "d2l_offline_events_queue";

export function getOfflineQueue(): StatEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: StatEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage quota might be exceeded
  }
}

export function queueEventForSync(event: StatEvent) {
  const current = getOfflineQueue();
  current.push(event);
  saveOfflineQueue(current);
}

export function removeFromOfflineQueue(eventId: string) {
  const current = getOfflineQueue();
  const updated = current.filter((e) => e.id !== eventId);
  saveOfflineQueue(updated);
}
