import type {
  ContentReportReason,
  ConversationSummary,
  DirectMessage,
  MessageMode,
  MutualRelationship,
  PublicCharacterProfile,
  RelationshipHistoryEvent,
  RelationshipState,
  ReportTargetType,
  RomanticPrivacyValue,
  SocialNotification,
  SocialPrivacySettings,
  SocialPrivacyValue,
  SocialInteraction,
  SocialInteractionAction,
  SocialRequest,
  SocialRequestStatus,
  SocialRequestType,
} from "../../types/game";
import { requireSupabaseClient } from "./client";
import { getPublicCharacter } from "./characterRepository";

type DirectMessageRow = {
  id: string;
  conversation_id: string;
  sender_character_id: string;
  mode: MessageMode;
  body: string;
  read_at: string | null;
  created_at: string;
};

type RelationshipRow = {
  source_character_id: string;
  target_character_id: string;
  familiarity: number;
  friendship: number;
  romantic_interest: number;
  updated_at: string;
};

type SocialInteractionRow = {
  id: string;
  source_character_id: string;
  target_character_id: string;
  action: SocialInteractionAction;
  event_text: string;
  created_at: string;
};

type MutualRelationshipRow = {
  id: string;
  character_one_id: string;
  character_two_id: string;
  status: MutualRelationship["status"];
  started_at: string;
  ended_at: string | null;
  ended_reason: "manual" | "death" | null;
  created_at: string;
  updated_at: string;
};

type SocialRequestRow = {
  id: string;
  source_character_id: string;
  target_character_id: string;
  type: SocialRequestType;
  status: SocialRequestStatus;
  created_at: string;
  responded_at: string | null;
};

type RelationshipHistoryRow = {
  id: string;
  character_one_id: string;
  character_two_id: string;
  event_type: string;
  summary: string;
  created_at: string;
};

type NotificationRow = {
  id: string;
  character_id: string;
  kind: string;
  body: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
};

type PrivacyRow = {
  character_id: string;
  dm_policy: SocialPrivacyValue;
  interaction_policy: SocialPrivacyValue;
  romantic_request_policy: RomanticPrivacyValue;
  updated_at: string;
};

export async function getOrCreateConversation(myCharacterId: string, otherCharacterId: string): Promise<string> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    other_character_id: otherCharacterId,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function listConversationSummaries(myCharacterId: string): Promise<ConversationSummary[]> {
  const supabase = requireSupabaseClient();
  const { data: participantRows, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("character_id", myCharacterId)
    .limit(50);

  if (error) {
    throw error;
  }

  const summaries: Array<ConversationSummary | null> = await Promise.all(
    (participantRows ?? []).map(async (participant) => {
      const { data: otherParticipantRows } = await supabase
        .from("conversation_participants")
        .select("character_id")
        .eq("conversation_id", participant.conversation_id)
        .neq("character_id", myCharacterId)
        .limit(1);
      const otherCharacterId = otherParticipantRows?.[0]?.character_id as string | undefined;
      const otherCharacter = otherCharacterId ? await getPublicCharacter(otherCharacterId) : null;
      const { data: messageRows } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", participant.conversation_id)
        .order("created_at", { ascending: false })
        .limit(25);
      const messages = (messageRows ?? []) as DirectMessageRow[];
      const lastMessage = messages[0];
      const unreadCount = messages.filter((message) => (
        message.sender_character_id !== myCharacterId && !message.read_at
      )).length;

      if (!otherCharacter) {
        return null;
      }

      return {
        id: participant.conversation_id as string,
        otherCharacter,
        lastMessageBody: lastMessage?.body,
        lastMessageAt: lastMessage?.created_at,
        unreadCount,
      };
    }),
  );

  return summaries.filter((summary): summary is ConversationSummary => summary !== null);
}

export async function listConversationMessages(conversationId: string): Promise<DirectMessage[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    throw error;
  }

  return (data as DirectMessageRow[]).map(mapMessageRow);
}

export async function sendDirectMessage(
  conversationId: string,
  senderCharacterId: string,
  body: string,
  mode: MessageMode,
): Promise<DirectMessage> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      conversation_id: conversationId,
      sender_character_id: senderCharacterId,
      body,
      mode,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapMessageRow(data as DirectMessageRow);
}

export async function markConversationRead(conversationId: string, myCharacterId: string): Promise<void> {
  const supabase = requireSupabaseClient();
  void myCharacterId;
  const { error } = await supabase.rpc("mark_conversation_read", {
    conversation_id: conversationId,
  });

  if (error) {
    throw error;
  }
}

export async function getRelationship(
  sourceCharacterId: string,
  targetCharacterId: string,
): Promise<RelationshipState | null> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("character_relationships")
    .select("*")
    .eq("source_character_id", sourceCharacterId)
    .eq("target_character_id", targetCharacterId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapRelationshipRow(data as RelationshipRow) : null;
}

export async function performInteraction(
  targetCharacterId: string,
  action: SocialInteractionAction,
): Promise<SocialInteraction> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("perform_social_interaction", {
    target_character_id: targetCharacterId,
    interaction_action: action,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return mapInteractionRow(row as SocialInteractionRow);
}

export async function sendSocialRequest(
  targetCharacterId: string,
  type: SocialRequestType,
): Promise<SocialRequest> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("send_social_request", {
    target_character_id: targetCharacterId,
    request_type: type,
  });

  if (error) {
    throw error;
  }

  return mapRequestRow(data as SocialRequestRow);
}

export async function respondSocialRequest(requestId: string, response: "accepted" | "declined"): Promise<SocialRequest> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("respond_social_request", {
    request_id: requestId,
    response,
  });

  if (error) {
    throw error;
  }

  return mapRequestRow(data as SocialRequestRow);
}

export async function endMutualRelationship(otherCharacterId: string): Promise<MutualRelationship> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("end_mutual_relationship", {
    other_character_id: otherCharacterId,
  });

  if (error) {
    throw error;
  }

  return mapMutualRelationshipRow(data as MutualRelationshipRow);
}

export async function listMutualRelationships(myCharacterId: string): Promise<MutualRelationship[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("mutual_relationships")
    .select("*")
    .or(`character_one_id.eq.${myCharacterId},character_two_id.eq.${myCharacterId}`)
    .is("ended_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = data as MutualRelationshipRow[];
  const relationships = await Promise.all(rows.map(async (row) => {
    const otherCharacterId = row.character_one_id === myCharacterId ? row.character_two_id : row.character_one_id;
    return {
      ...mapMutualRelationshipRow(row),
      otherCharacter: await getPublicCharacter(otherCharacterId) ?? undefined,
    };
  }));

  return relationships;
}

export async function listSocialRequests(myCharacterId: string): Promise<SocialRequest[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("social_requests")
    .select("*")
    .or(`source_character_id.eq.${myCharacterId},target_character_id.eq.${myCharacterId}`)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = data as SocialRequestRow[];
  return Promise.all(rows.map(async (row) => ({
    ...mapRequestRow(row),
    sourceCharacter: await getPublicCharacter(row.source_character_id) ?? undefined,
    targetCharacter: await getPublicCharacter(row.target_character_id) ?? undefined,
  })));
}

export async function listRelationshipHistory(characterA: string, characterB: string): Promise<RelationshipHistoryEvent[]> {
  const supabase = requireSupabaseClient();
  const firstId = characterA < characterB ? characterA : characterB;
  const secondId = characterA < characterB ? characterB : characterA;
  const { data, error } = await supabase
    .from("relationship_history_events")
    .select("*")
    .eq("character_one_id", firstId)
    .eq("character_two_id", secondId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return (data as RelationshipHistoryRow[]).map(mapRelationshipHistoryRow);
}

export async function listNotifications(): Promise<SocialNotification[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("social_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return (data as NotificationRow[]).map(mapNotificationRow);
}

export async function markNotificationsRead(): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.rpc("mark_notifications_read");

  if (error) {
    throw error;
  }
}

export async function getPrivacySettings(characterId: string): Promise<SocialPrivacySettings | null> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("social_privacy_settings")
    .select("*")
    .eq("character_id", characterId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPrivacyRow(data as PrivacyRow) : null;
}

export async function updatePrivacySettings(
  dmPolicy: SocialPrivacyValue,
  interactionPolicy: SocialPrivacyValue,
  romanticRequestPolicy: RomanticPrivacyValue,
): Promise<SocialPrivacySettings> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("update_social_privacy", {
    dm_policy: dmPolicy,
    interaction_policy: interactionPolicy,
    romantic_request_policy: romanticRequestPolicy,
  });

  if (error) {
    throw error;
  }

  return mapPrivacyRow(data as PrivacyRow);
}

export async function blockCharacter(targetCharacterId: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.rpc("block_character", {
    target_character_id: targetCharacterId,
  });

  if (error) {
    throw error;
  }
}

export async function submitContentReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: ContentReportReason,
  details: string,
): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.rpc("submit_content_report", {
    target_type: targetType,
    target_id: targetId,
    reason,
    details,
  });

  if (error) {
    throw error;
  }
}

export async function listRecentInteractions(characterA: string, characterB: string): Promise<SocialInteraction[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("social_interactions")
    .select("*")
    .or(`and(source_character_id.eq.${characterA},target_character_id.eq.${characterB}),and(source_character_id.eq.${characterB},target_character_id.eq.${characterA})`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data as SocialInteractionRow[]).map(mapInteractionRow);
}

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: DirectMessage) => void,
): () => void {
  const supabase = requireSupabaseClient();
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(mapMessageRow(payload.new as DirectMessageRow)),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

function mapMessageRow(row: DirectMessageRow): DirectMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderCharacterId: row.sender_character_id,
    mode: row.mode,
    body: row.body,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

function mapRelationshipRow(row: RelationshipRow): RelationshipState {
  return {
    sourceCharacterId: row.source_character_id,
    targetCharacterId: row.target_character_id,
    familiarity: row.familiarity,
    friendship: row.friendship,
    romanticInterest: row.romantic_interest,
    updatedAt: row.updated_at,
  };
}

function mapInteractionRow(row: SocialInteractionRow): SocialInteraction {
  return {
    id: row.id,
    sourceCharacterId: row.source_character_id,
    targetCharacterId: row.target_character_id,
    action: row.action,
    eventText: row.event_text,
    createdAt: row.created_at,
  };
}

function mapMutualRelationshipRow(row: MutualRelationshipRow): MutualRelationship {
  return {
    id: row.id,
    characterOneId: row.character_one_id,
    characterTwoId: row.character_two_id,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    endedReason: row.ended_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRequestRow(row: SocialRequestRow): SocialRequest {
  return {
    id: row.id,
    sourceCharacterId: row.source_character_id,
    targetCharacterId: row.target_character_id,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? undefined,
  };
}

function mapRelationshipHistoryRow(row: RelationshipHistoryRow): RelationshipHistoryEvent {
  return {
    id: row.id,
    characterOneId: row.character_one_id,
    characterTwoId: row.character_two_id,
    eventType: row.event_type,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

function mapNotificationRow(row: NotificationRow): SocialNotification {
  return {
    id: row.id,
    characterId: row.character_id,
    kind: row.kind,
    body: row.body,
    linkPath: row.link_path ?? undefined,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

function mapPrivacyRow(row: PrivacyRow): SocialPrivacySettings {
  return {
    characterId: row.character_id,
    dmPolicy: row.dm_policy,
    interactionPolicy: row.interaction_policy,
    romanticRequestPolicy: row.romantic_request_policy,
    updatedAt: row.updated_at,
  };
}
