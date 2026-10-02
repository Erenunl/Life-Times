import { type FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppOutletContext } from "../layouts/MainLayout";
import { getAuthState, type AuthState } from "../services/supabase/authRepository";
import { getOwnedCharacter, upsertOwnedCharacter } from "../services/supabase/characterRepository";
import { isSupabaseConfigured } from "../services/supabase/client";
import {
  createForumReply,
  createForumThread,
  listForumPosts,
  listForumThreads,
} from "../services/supabase/forumRepository";
import { submitContentReport } from "../services/supabase/socialRepository";
import type { ContentReportReason, ForumPost, ForumThread, MessageMode, PublicCharacterProfile } from "../types/game";
import { formatStoredDate } from "../utils/realTime";
import { AuthPage } from "./AuthPage";

export function ForumsPage() {
  const { character } = useOutletContext<AppOutletContext>();
  const [authState, setAuthState] = useState<AuthState>({ session: null, user: null });
  const [ownedProfile, setOwnedProfile] = useState<PublicCharacterProfile | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<MessageMode>("ic");
  const [replyBody, setReplyBody] = useState("");
  const [reportReason, setReportReason] = useState<ContentReportReason>("harassment");
  const [error, setError] = useState("");

  useEffect(() => {
    void refreshForumState();
  }, []);

  async function refreshForumState() {
    if (!isSupabaseConfigured) {
      return;
    }

    try {
      const nextAuthState = await getAuthState();
      setAuthState(nextAuthState);

      if (!nextAuthState.user) {
        return;
      }

      const [profile, nextThreads] = await Promise.all([
        getOwnedCharacter(),
        listForumThreads(),
      ]);
      setOwnedProfile(profile);
      setThreads(nextThreads);
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleSyncCharacter() {
    try {
      setOwnedProfile(await upsertOwnedCharacter(character));
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ownedProfile || !title.trim() || !body.trim()) {
      return;
    }

    try {
      const thread = await createForumThread(ownedProfile.id, title.trim(), body.trim(), mode);
      setThreads((currentThreads) => [thread, ...currentThreads]);
      setTitle("");
      setBody("");
      setSelectedThread(thread);
      setPosts(await listForumPosts(thread.id));
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  async function handleOpenThread(thread: ForumThread) {
    setSelectedThread(thread);
    setPosts(await listForumPosts(thread.id));
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ownedProfile || !selectedThread || !replyBody.trim()) {
      return;
    }

    try {
      const post = await createForumReply(selectedThread.id, ownedProfile.id, replyBody.trim());
      setPosts((currentPosts) => [...currentPosts, post]);
      setReplyBody("");
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  function handleError(caughtError: unknown) {
    setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
  }

  async function handleReportPost(postId: string) {
    try {
      await submitContentReport("forum_post", postId, reportReason, "");
    } catch (caughtError) {
      handleError(caughtError);
    }
  }

  if (!isSupabaseConfigured || !authState.user) {
    return <AuthPage />;
  }

  return (
    <div className="forum-page">
      <section className="school-panel">
        <h2>Forums</h2>
        {!ownedProfile ? (
          <p className="notice-line">Link your local character before creating threads or replies.</p>
        ) : null}
        <button type="button" onClick={handleSyncCharacter} disabled={character.isDeceased}>
          {ownedProfile ? "Sync Character" : "Link Character"}
        </button>
        {error ? <p className="field-error">{error}</p> : null}
      </section>

      <section className="school-panel">
        <h2>Create Thread</h2>
        <form className="forum-form" onSubmit={handleCreateThread}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Thread title" />
          <select value={mode} onChange={(event) => setMode(event.target.value as MessageMode)}>
            <option value="ic">IC</option>
            <option value="ooc">OOC</option>
          </select>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Opening post" rows={5} />
          <button type="submit" disabled={!ownedProfile || character.isDeceased}>Create Thread</button>
        </form>
      </section>

      <section className="school-panel">
        <h2>Threads</h2>
        <table className="school-table">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Title</th>
              <th>Author</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {threads.map((thread) => (
              <tr key={thread.id} onClick={() => void handleOpenThread(thread)}>
                <td>{thread.mode.toUpperCase()}</td>
                <td>{thread.title}</td>
                <td>{thread.author ? `${thread.author.firstName} ${thread.author.lastName}` : "Unknown"}</td>
                <td>{formatStoredDate(thread.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selectedThread ? (
        <section className="school-panel forum-thread-panel">
        <h2>[{selectedThread.mode.toUpperCase()}] {selectedThread.title}</h2>
          <div className="report-row">
            <select value={reportReason} onChange={(event) => setReportReason(event.target.value as ContentReportReason)}>
              <option value="harassment">Harassment</option>
              <option value="spam">Spam</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="impersonation">Impersonation</option>
              <option value="other">Other</option>
            </select>
            <span className="muted">Use report on a specific post below.</span>
          </div>
          <div className="forum-post-list">
            {posts.map((post) => (
              <article key={post.id} className="forum-post">
                <div>
                  {post.author?.profileImageUrl ? (
                    <img className="mini-portrait" src={post.author.profileImageUrl} alt={post.author.firstName} />
                  ) : (
                    <span className="mini-portrait">No photo</span>
                  )}
                  <strong>{post.author ? `${post.author.firstName} ${post.author.lastName}` : "Unknown"}</strong>
                  <small>{formatStoredDate(post.createdAt)}</small>
                </div>
                <p><span className="mode-label">{selectedThread.mode.toUpperCase()}</span> {post.body}</p>
                <button type="button" onClick={() => void handleReportPost(post.id)}>Report</button>
              </article>
            ))}
          </div>
          <form className="message-form" onSubmit={handleReply}>
            <input
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder={`Reply as ${selectedThread.mode.toUpperCase()}`}
            />
            <button type="submit" disabled={!ownedProfile || character.isDeceased}>Reply</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
