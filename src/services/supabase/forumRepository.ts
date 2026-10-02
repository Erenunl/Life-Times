import type { ForumPost, ForumThread, MessageMode, PublicCharacterProfile } from "../../types/game";
import { requireSupabaseClient } from "./client";

type ThreadRow = {
  id: string;
  author_character_id: string;
  title: string;
  mode: MessageMode;
  category: string;
  created_at: string;
  updated_at: string;
  characters?: CharacterEmbed;
};

type PostRow = {
  id: string;
  thread_id: string;
  author_character_id: string;
  body: string;
  created_at: string;
  characters?: CharacterEmbed;
};

type CharacterEmbed = {
  id: string;
  owner_user_id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string | null;
  city_id: string;
  life_stage: "high-school";
  education_status: string;
  biography: string;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  is_deceased: boolean;
  created_at: string;
  updated_at: string;
};

export async function listForumThreads(): Promise<ForumThread[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("forum_threads")
    .select("*, characters(*)")
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) {
    throw error;
  }

  return (data as ThreadRow[]).map(mapThreadRow);
}

export async function createForumThread(
  authorCharacterId: string,
  title: string,
  body: string,
  mode: MessageMode,
): Promise<ForumThread> {
  const supabase = requireSupabaseClient();
  const { data: threadRow, error: threadError } = await supabase
    .from("forum_threads")
    .insert({
      author_character_id: authorCharacterId,
      title,
      mode,
      category: "General",
    })
    .select("*, characters(*)")
    .single();

  if (threadError) {
    throw threadError;
  }

  const { error: postError } = await supabase
    .from("forum_posts")
    .insert({
      thread_id: threadRow.id,
      author_character_id: authorCharacterId,
      body,
    });

  if (postError) {
    throw postError;
  }

  return mapThreadRow(threadRow as ThreadRow);
}

export async function listForumPosts(threadId: string): Promise<ForumPost[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*, characters(*)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    throw error;
  }

  return (data as PostRow[]).map(mapPostRow);
}

export async function createForumReply(
  threadId: string,
  authorCharacterId: string,
  body: string,
): Promise<ForumPost> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("forum_posts")
    .insert({
      thread_id: threadId,
      author_character_id: authorCharacterId,
      body,
    })
    .select("*, characters(*)")
    .single();

  if (error) {
    throw error;
  }

  return mapPostRow(data as PostRow);
}

function mapThreadRow(row: ThreadRow): ForumThread {
  return {
    id: row.id,
    authorCharacterId: row.author_character_id,
    title: row.title,
    mode: row.mode,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: row.characters ? mapCharacterEmbed(row.characters) : undefined,
  };
}

function mapPostRow(row: PostRow): ForumPost {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorCharacterId: row.author_character_id,
    body: row.body,
    createdAt: row.created_at,
    author: row.characters ? mapCharacterEmbed(row.characters) : undefined,
  };
}

function mapCharacterEmbed(row: CharacterEmbed): PublicCharacterProfile {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    profileImageUrl: row.profile_image_url ?? undefined,
    cityId: row.city_id,
    lifeStage: row.life_stage,
    educationStatus: row.education_status,
    biography: row.biography,
    birthDate: {
      year: row.birth_year,
      month: row.birth_month,
      day: row.birth_day,
    },
    isDeceased: row.is_deceased,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
