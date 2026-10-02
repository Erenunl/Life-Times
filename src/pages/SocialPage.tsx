import { type FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { findCityById } from "../data/cities";
import {
  CLOSE_FRIEND_MIN_FRIENDSHIP,
  DATING_REQUEST_MIN_FAMILIARITY,
  FRIEND_REQUEST_MIN_FAMILIARITY,
  socialInteractionLabels,
} from "../config/socialRules";
import { getCharacterDisplayName } from "../features/character/createCharacter";
import type { AppOutletContext } from "../layouts/MainLayout";
import { getAuthState, signOut, type AuthState } from "../services/supabase/authRepository";
import { getOwnedCharacter, listPublicCharacters, upsertOwnedCharacter } from "../services/supabase/characterRepository";
import { isSupabaseConfigured } from "../services/supabase/client";
import {
  getOrCreateConversation,
  getRelationship,
  blockCharacter,
  endMutualRelationship,
  getPrivacySettings,
  listConversationMessages,
  listConversationSummaries,
  listMutualRelationships,
  listNotifications,
  listRecentInteractions,
  listRelationshipHistory,
  listSocialRequests,
  markConversationRead,
  markNotificationsRead,
  performInteraction,
  respondSocialRequest,
  sendSocialRequest,
  sendDirectMessage,
  submitContentReport,
  subscribeToConversation,
  updatePrivacySettings,
} from "../services/supabase/socialRepository";
import type {
  ContentReportReason,
  ConversationSummary,
  DirectMessage,
  MessageMode,
  MutualRelationship,
  PublicCharacterProfile,
  RelationshipHistoryEvent,
  RelationshipState,
  RomanticPrivacyValue,
  SocialNotification,
  SocialPrivacySettings,
  SocialPrivacyValue,
  SocialInteraction,
  SocialInteractionAction,
  SocialRequest,
  SocialRequestType,
} from "../types/game";
import { calculateAge, getGameDate } from "../utils/gameTime";
import { formatStoredDate, formatStoredTime } from "../utils/realTime";
import { AuthPage } from "./AuthPage";

const interactionActions: SocialInteractionAction[] = [
  "wave",
  "smile",
  "wink",
  "hug",
  "hold_hands",
  "give_flowers",
  "blow_kiss",
  "compliment",
  "joke",
  "flirt",
];

export function SocialPage() {
  const { character } = useOutletContext<AppOutletContext>();
  const [authState, setAuthState] = useState<AuthState>({ session: null, user: null });
  const [ownedProfile, setOwnedProfile] = useState<PublicCharacterProfile | null>(null);
  const [players, setPlayers] = useState<PublicCharacterProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PublicCharacterProfile | null>(null);
  const [relationship, setRelationship] = useState<RelationshipState | null>(null);
  const [interactions, setInteractions] = useState<SocialInteraction[]>([]);
  const [history, setHistory] = useState<RelationshipHistoryEvent[]>([]);
  const [relationships, setRelationships] = useState<MutualRelationship[]>([]);
  const [requests, setRequests] = useState<SocialRequest[]>([]);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [privacy, setPrivacy] = useState<SocialPrivacySettings | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [messageMode, setMessageMode] = useState<MessageMode>("ic");
  const [reportReason, setReportReason] = useState<ContentReportReason>("harassment");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void refreshAuthAndSocial();
  }, []);

  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    void listConversationMessages(activeConversation.id)
      .then(async (nextMessages) => {
        setMessages(nextMessages);
        if (ownedProfile) {
          await markConversationRead(activeConversation.id, ownedProfile.id);
        }
      })
      .catch(handleError);
    const unsubscribe = subscribeToConversation(activeConversation.id, (message) => {
      setMessages((currentMessages) => currentMessages.some((item) => item.id === message.id)
        ? currentMessages
        : [...currentMessages, message]);
    });

    return unsubscribe;
  }, [activeConversation?.id]);

  async function refreshAuthAndSocial() {
    if (!isSupabaseConfigured) {
      return;
    }

    try {
      const nextAuthState = await getAuthState();
      setAuthState(nextAuthState);

      if (!nextAuthState.user) {
        return;
      }

      const profile = await getOwnedCharacter();
      setOwnedProfile(profile);
      await refreshPlayers(search);

      if (profile) {
        const [nextConversations, nextRelationships, nextRequests, nextNotifications, nextPrivacy] = await Promise.all([
          listConversationSummaries(profile.id),
          listMutualRelationships(profile.id),
          listSocialRequests(profile.id),
          listNotifications(),
          getPrivacySettings(profile.id),
        ]);
        setConversations(nextConversations);
        setRelationships(nextRelationships);
        setRequests(nextRequests);
        setNotifications(nextNotifications);
        setPrivacy(nextPrivacy);
      }
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function refreshPlayers(searchTerm: string) {
    const listedPlayers = await listPublicCharacters(searchTerm);
    setPlayers(listedPlayers.filter((player) => player.id !== ownedProfile?.id && player.id !== character.id));
  }

  async function handleSyncCharacter() {
    try {
      const profile = await upsertOwnedCharacter(character);
      setOwnedProfile(profile);
      setStatus("Your local character is now linked to your account.");
      await refreshPlayers(search);
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await refreshPlayers(search);
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleSelectProfile(profile: PublicCharacterProfile) {
    setSelectedProfile(profile);
    setActiveConversation(null);
    setMessages([]);

    if (!ownedProfile) {
      return;
    }

    try {
      const [nextRelationship, nextInteractions] = await Promise.all([
        getRelationship(ownedProfile.id, profile.id),
        listRecentInteractions(ownedProfile.id, profile.id),
      ]);
      setRelationship(nextRelationship);
      setInteractions(nextInteractions);
      setHistory(await listRelationshipHistory(ownedProfile.id, profile.id));
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleOpenConversation(profile: PublicCharacterProfile) {
    if (!ownedProfile) {
      setError("Sync your character before messaging.");
      return;
    }

    try {
      const conversationId = await getOrCreateConversation(ownedProfile.id, profile.id);
      const otherCharacter = profile;
      const summary: ConversationSummary = { id: conversationId, otherCharacter, unreadCount: 0 };
      setActiveConversation(summary);
      setSelectedProfile(profile);
      setConversations((current) => current.some((item) => item.id === conversationId) ? current : [summary, ...current]);
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeConversation || !ownedProfile || !messageBody.trim()) {
      return;
    }

    try {
      const sentMessage = await sendDirectMessage(activeConversation.id, ownedProfile.id, messageBody.trim(), messageMode);
      setMessages((currentMessages) => [...currentMessages, sentMessage]);
      setMessageBody("");
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleInteraction(action: SocialInteractionAction) {
    if (!selectedProfile || !ownedProfile) {
      return;
    }

    try {
      const interaction = await performInteraction(selectedProfile.id, action);
      const [nextRelationship, nextInteractions] = await Promise.all([
        getRelationship(ownedProfile.id, selectedProfile.id),
        listRecentInteractions(ownedProfile.id, selectedProfile.id),
      ]);
      setRelationship(nextRelationship);
      setInteractions([interaction, ...nextInteractions.filter((item) => item.id !== interaction.id)]);
      setHistory(await listRelationshipHistory(ownedProfile.id, selectedProfile.id));
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleSendRequest(type: SocialRequestType) {
    if (!selectedProfile) {
      return;
    }

    try {
      await sendSocialRequest(selectedProfile.id, type);
      if (ownedProfile) {
        setRequests(await listSocialRequests(ownedProfile.id));
      }
      setStatus(`${type.replace("_", " ")} request sent.`);
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleRespondRequest(requestId: string, response: "accepted" | "declined") {
    try {
      await respondSocialRequest(requestId, response);
      if (ownedProfile) {
        const [nextRequests, nextRelationships] = await Promise.all([
          listSocialRequests(ownedProfile.id),
          listMutualRelationships(ownedProfile.id),
        ]);
        setRequests(nextRequests);
        setRelationships(nextRelationships);
      }
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleEndRelationship(otherCharacterId: string) {
    try {
      await endMutualRelationship(otherCharacterId);
      if (ownedProfile) {
        setRelationships(await listMutualRelationships(ownedProfile.id));
      }
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleBlockProfile() {
    if (!selectedProfile) {
      return;
    }

    try {
      await blockCharacter(selectedProfile.id);
      setStatus(`${selectedProfile.firstName} has been blocked.`);
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleReportProfile() {
    if (!selectedProfile) {
      return;
    }

    try {
      await submitContentReport("character", selectedProfile.id, reportReason, "");
      setStatus("Report submitted.");
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handlePrivacyChange(
    field: keyof Pick<SocialPrivacySettings, "dmPolicy" | "interactionPolicy" | "romanticRequestPolicy">,
    value: SocialPrivacyValue | RomanticPrivacyValue,
  ) {
    const nextPrivacy = {
      dmPolicy: privacy?.dmPolicy ?? "everyone",
      interactionPolicy: privacy?.interactionPolicy ?? "everyone",
      romanticRequestPolicy: privacy?.romanticRequestPolicy ?? "eligible",
      [field]: value,
    };

    try {
      setPrivacy(await updatePrivacySettings(
        nextPrivacy.dmPolicy,
        nextPrivacy.interactionPolicy,
        nextPrivacy.romanticRequestPolicy,
      ));
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleMarkNotificationsRead() {
    try {
      await markNotificationsRead();
      setNotifications(await listNotifications());
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleSignOut() {
    await signOut();
    setAuthState({ session: null, user: null });
    setOwnedProfile(null);
    setPlayers([]);
    setSelectedProfile(null);
    setActiveConversation(null);
  }

  function handleError(caughtError: unknown) {
    setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
  }

  if (!isSupabaseConfigured || !authState.user) {
    return <AuthPage />;
  }

  return (
    <div className="social-page">
      <section className="school-panel social-toolbar">
        <h2>Social</h2>
        <div className="social-toolbar-body">
          <span>{authState.user.email}</span>
          <button type="button" onClick={handleSignOut}>Sign Out</button>
          <button type="button" onClick={handleSyncCharacter} disabled={character.isDeceased}>
            {ownedProfile ? "Sync Character" : "Link Character"}
          </button>
        </div>
        {!ownedProfile ? <p className="notice-line">Link your local character before messaging, posting, or interacting.</p> : null}
        {status ? <p className="field-note">{status}</p> : null}
        {error ? <p className="field-error">{error}</p> : null}
      </section>

      <section className="school-panel">
        <h2>Players</h2>
        <form className="search-row" onSubmit={handleSearch}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" />
          <button type="submit">Search</button>
        </form>
        <div className="player-list">
          {players.map((player) => (
            <button key={player.id} type="button" className="player-row" onClick={() => void handleSelectProfile(player)}>
              <ProfilePortrait profile={player} />
              <span>
                <strong>{player.firstName} {player.lastName}</strong>
                <small>{findCityById(player.cityId)?.name ?? "Unknown city"} · {player.lifeStage}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="school-panel">
        <h2>Messages</h2>
        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button key={conversation.id} type="button" onClick={() => setActiveConversation(conversation)}>
              <span>{conversation.otherCharacter.firstName} {conversation.otherCharacter.lastName}</span>
              {conversation.unreadCount > 0 ? <strong>{conversation.unreadCount}</strong> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="school-panel">
        <h2>Requests</h2>
        <div className="request-list">
          {requests.map((request) => {
            const incoming = request.targetCharacterId === ownedProfile?.id;
            const other = incoming ? request.sourceCharacter : request.targetCharacter;
            return (
              <div key={request.id} className="request-row">
                <span>{other ? `${other.firstName} ${other.lastName}` : "Unknown"} · {request.type}</span>
                {incoming ? (
                  <span>
                    <button type="button" onClick={() => void handleRespondRequest(request.id, "accepted")}>Accept</button>
                    <button type="button" onClick={() => void handleRespondRequest(request.id, "declined")}>Decline</button>
                  </span>
                ) : (
                  <small>Pending</small>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="school-panel">
        <h2>Relationships</h2>
        <div className="relationship-list">
          {relationships.map((item) => (
            <div key={item.id} className="request-row">
              <span>{item.otherCharacter ? `${item.otherCharacter.firstName} ${item.otherCharacter.lastName}` : "Unknown"} · {item.status.replace("_", " ")}</span>
              {item.otherCharacter ? (
                <button type="button" onClick={() => void handleEndRelationship(item.otherCharacter?.id ?? "")}>
                  {item.status === "dating" ? "Break Up" : "End"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="school-panel">
        <h2>Notifications</h2>
        <button type="button" onClick={() => void handleMarkNotificationsRead()}>Mark Read</button>
        <ul className="event-list">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <strong>{notification.readAt ? "Read" : "New"}</strong>
              <span>{notification.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="school-panel">
        <h2>Privacy</h2>
        <div className="privacy-grid">
          <label>DMs
            <select value={privacy?.dmPolicy ?? "everyone"} onChange={(event) => void handlePrivacyChange("dmPolicy", event.target.value as SocialPrivacyValue)}>
              <option value="everyone">Everyone</option>
              <option value="friends">Friends only</option>
              <option value="nobody">Nobody</option>
            </select>
          </label>
          <label>RP Interactions
            <select value={privacy?.interactionPolicy ?? "everyone"} onChange={(event) => void handlePrivacyChange("interactionPolicy", event.target.value as SocialPrivacyValue)}>
              <option value="everyone">Everyone</option>
              <option value="friends">Friends only</option>
              <option value="nobody">Nobody</option>
            </select>
          </label>
          <label>Romantic Requests
            <select value={privacy?.romanticRequestPolicy ?? "eligible"} onChange={(event) => void handlePrivacyChange("romanticRequestPolicy", event.target.value as RomanticPrivacyValue)}>
              <option value="eligible">Everyone eligible</option>
              <option value="friends">Friends only</option>
              <option value="nobody">Nobody</option>
            </select>
          </label>
        </div>
      </section>

      {selectedProfile ? (
        <section className="school-panel public-profile-panel">
          <h2>{selectedProfile.firstName} {selectedProfile.lastName}</h2>
          <div className="public-profile">
            <ProfilePortrait profile={selectedProfile} />
            <dl className="data-list">
              <div><dt>Age</dt><dd>{calculateAge(getGameDate(), selectedProfile.birthDate)}</dd></div>
              <div><dt>City</dt><dd>{findCityById(selectedProfile.cityId)?.name ?? "Unknown"}</dd></div>
              <div><dt>Education</dt><dd>{selectedProfile.educationStatus}</dd></div>
            </dl>
          </div>
          <p>{selectedProfile.biography || "No biography yet."}</p>
          <div className="class-actions">
            <button type="button" onClick={() => void handleOpenConversation(selectedProfile)}>Message</button>
            {canShowFriendRequest(relationship, relationships, selectedProfile.id) ? (
              <button type="button" onClick={() => void handleSendRequest("friend")}>Add Friend</button>
            ) : null}
            {canShowCloseFriendRequest(relationship, relationships, selectedProfile.id) ? (
              <button type="button" onClick={() => void handleSendRequest("close_friend")}>Close Friends</button>
            ) : null}
            {canShowDatingRequest(relationship, relationships, selectedProfile.id) ? (
              <button type="button" onClick={() => void handleSendRequest("dating")}>Ask on a Date</button>
            ) : null}
            <button type="button" className="secondary-button" onClick={() => void handleBlockProfile()}>Block</button>
          </div>
          <RelationshipBars relationship={relationship} targetName={selectedProfile.firstName} />
          <div className="report-row">
            <select value={reportReason} onChange={(event) => setReportReason(event.target.value as ContentReportReason)}>
              <option value="harassment">Harassment</option>
              <option value="spam">Spam</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="impersonation">Impersonation</option>
              <option value="other">Other</option>
            </select>
            <button type="button" onClick={() => void handleReportProfile()}>Report Profile</button>
          </div>
          <h3>Interact</h3>
          <div className="interaction-grid">
            {interactionActions.map((action) => (
              <button key={action} type="button" disabled={!ownedProfile} onClick={() => void handleInteraction(action)}>
                {socialInteractionLabels[action]}
              </button>
            ))}
          </div>
          <ul className="event-list">
            {history.map((event) => (
              <li key={event.id}>
                <strong>{formatStoredDate(event.createdAt)}</strong>
                <span>{event.summary}</span>
              </li>
            ))}
            {interactions.map((interaction) => (
              <li key={interaction.id}>
                <strong>{formatStoredDate(interaction.createdAt)}</strong>
                <span>{interaction.eventText}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeConversation ? (
        <section className="school-panel conversation-panel">
          <h2>Conversation with {activeConversation.otherCharacter.firstName}</h2>
          <div className="message-list">
            {messages.map((message) => (
              <div key={message.id} className="message-row">
                <strong>[{message.mode.toUpperCase()}]</strong>
                <span>{message.body}</span>
                <small>{formatStoredTime(message.createdAt)}</small>
                <button type="button" onClick={() => void submitContentReport("direct_message", message.id, reportReason, "")}>
                  Report
                </button>
              </div>
            ))}
          </div>
          <form className="message-form" onSubmit={handleSendMessage}>
            <select value={messageMode} onChange={(event) => setMessageMode(event.target.value as MessageMode)}>
              <option value="ic">IC</option>
              <option value="ooc">OOC</option>
            </select>
            <input value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write a message" />
            <button type="submit">Send</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function ProfilePortrait({ profile }: { profile: PublicCharacterProfile }) {
  return profile.profileImageUrl ? (
    <img className="mini-portrait" src={profile.profileImageUrl} alt={`${profile.firstName} ${profile.lastName}`} />
  ) : (
    <span className="mini-portrait">No photo</span>
  );
}

function RelationshipBars({ relationship, targetName }: { relationship: RelationshipState | null; targetName: string }) {
  const values = relationship ?? {
    familiarity: 0,
    friendship: 0,
    romanticInterest: 0,
  };

  return (
    <div className="relationship-bars">
      <h3>Relationship with {targetName}</h3>
      <RelationshipBar label="Familiarity" value={values.familiarity} />
      <RelationshipBar label="Friendship" value={values.friendship} detail={getFriendshipLabel(values.friendship)} />
      <RelationshipBar label="Romantic Interest" value={values.romanticInterest} detail={getRomanceLabel(values.romanticInterest)} />
    </div>
  );
}

function RelationshipBar({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="relationship-bar">
      <span>{label}</span>
      <meter min={0} max={100} value={value} />
      <strong>{value}%</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function getFriendshipLabel(value: number): string {
  if (value < 10) return "Barely Know Them";
  if (value < 30) return "Acquaintance";
  if (value < 50) return "Friendly";
  if (value < 70) return "Good Friend";
  if (value < 90) return "Very Close";
  return "Deep Bond";
}

function getRomanceLabel(value: number): string {
  if (value < 10) return "No Interest";
  if (value < 30) return "Curious";
  if (value < 50) return "Attracted";
  if (value < 70) return "Strong Interest";
  if (value < 90) return "Very Strong Feelings";
  return "Deeply Attached";
}

function hasMutualStatus(relationships: MutualRelationship[], targetId: string, statuses: MutualRelationship["status"][]): boolean {
  return relationships.some((item) => item.otherCharacter?.id === targetId && statuses.includes(item.status));
}

function canShowFriendRequest(
  relationship: RelationshipState | null,
  relationships: MutualRelationship[],
  targetId: string,
): boolean {
  return !hasMutualStatus(relationships, targetId, ["friend", "close_friend", "dating"]) &&
    (relationship?.familiarity ?? 0) >= FRIEND_REQUEST_MIN_FAMILIARITY;
}

function canShowCloseFriendRequest(
  relationship: RelationshipState | null,
  relationships: MutualRelationship[],
  targetId: string,
): boolean {
  return hasMutualStatus(relationships, targetId, ["friend"]) &&
    (relationship?.friendship ?? 0) >= CLOSE_FRIEND_MIN_FRIENDSHIP;
}

function canShowDatingRequest(
  relationship: RelationshipState | null,
  relationships: MutualRelationship[],
  targetId: string,
): boolean {
  return !hasMutualStatus(relationships, targetId, ["dating"]) &&
    (relationship?.familiarity ?? 0) >= DATING_REQUEST_MIN_FAMILIARITY;
}
