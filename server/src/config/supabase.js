import { createClient } from "@supabase/supabase-js";
import { config } from "./env.js";

const serverAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

/**
 * Privileged client (service role). Bypasses RLS — use only for actions the
 * API has already authorized itself: payment capture, contact unlocks,
 * OAuth profile creation, broadcasts and public aggregate counts.
 */
export const serviceDb = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: serverAuthOptions,
});

/**
 * Anonymous client for public reads and for Supabase Auth flows
 * (sign up, sign in, refresh, password reset email).
 */
export const createAnonClient = () =>
  createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { ...serverAuthOptions, flowType: "implicit" },
  });

export const anonDb = createAnonClient();

/**
 * Per-request client that acts as the signed-in user. Every query runs with
 * that user's JWT, so the database RLS policies and triggers apply exactly as
 * they did when the browser called Supabase directly.
 */
export const createUserClient = (accessToken) =>
  createClient(config.supabase.url, config.supabase.anonKey, {
    auth: serverAuthOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
