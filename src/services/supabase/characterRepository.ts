import type { Character, PublicCharacterProfile } from "../../types/game";
import { requireSupabaseClient } from "./client";

type CharacterRow = {
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

export async function upsertOwnedCharacter(character: Character): Promise<PublicCharacterProfile> {
  const supabase = requireSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error("Sign in before syncing a character.");
  }

  const { data, error } = await supabase
    .from("characters")
    .upsert({
      id: character.id,
      owner_user_id: userData.user.id,
      first_name: character.firstName,
      last_name: character.lastName,
      profile_image_url: character.profileImage?.dataUrl ?? null,
      city_id: character.cityId,
      life_stage: character.lifeStage,
      education_status: character.education.status,
      biography: character.biography,
      birth_year: character.birthDate.year,
      birth_month: character.birthDate.month,
      birth_day: character.birthDate.day,
      is_deceased: character.isDeceased,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapCharacterRow(data as CharacterRow);
}

export async function getOwnedCharacter(): Promise<PublicCharacterProfile | null> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("is_deceased", false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapCharacterRow(data as CharacterRow) : null;
}

export async function listPublicCharacters(searchTerm: string): Promise<PublicCharacterProfile[]> {
  const supabase = requireSupabaseClient();
  let query = supabase
    .from("characters")
    .select("*")
    .eq("is_deceased", false)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (searchTerm.trim()) {
    query = query.or(`first_name.ilike.%${searchTerm.trim()}%,last_name.ilike.%${searchTerm.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data as CharacterRow[]).map(mapCharacterRow);
}

export async function getPublicCharacter(characterId: string): Promise<PublicCharacterProfile | null> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapCharacterRow(data as CharacterRow) : null;
}

function mapCharacterRow(row: CharacterRow): PublicCharacterProfile {
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
