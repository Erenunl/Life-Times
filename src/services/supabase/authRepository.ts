import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, requireSupabaseClient } from "./client";

export type AuthState = {
  session: Session | null;
  user: User | null;
};

export async function getAuthState(): Promise<AuthState> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { session: null, user: null };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return {
    session: data.session,
    user: data.session?.user ?? null,
  };
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
