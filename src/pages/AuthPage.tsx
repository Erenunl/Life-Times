import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSupabaseConfigured } from "../services/supabase/client";
import { signInWithEmail, signUpWithEmail } from "../services/supabase/authRepository";

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      if (mode === "sign-in") {
        await signInWithEmail(email, password);
        navigate("/social");
      } else {
        await signUpWithEmail(email, password);
        setStatus("Account created. Check your Supabase auth settings if email confirmation is enabled, then sign in.");
        setMode("sign-in");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Authentication failed.");
    }
  }

  return (
    <section className="school-panel auth-panel">
      <h2>{mode === "sign-in" ? "Sign In" : "Create Account"}</h2>
      {!isSupabaseConfigured ? (
        <p className="notice-line">
          Supabase is not configured. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`.
        </p>
      ) : null}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        {status ? <p className="field-note">{status}</p> : null}
        <div className="class-actions">
          <button type="submit" disabled={!isSupabaseConfigured}>
            {mode === "sign-in" ? "Sign In" : "Create Account"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          >
            {mode === "sign-in" ? "Need an account?" : "Already have an account?"}
          </button>
        </div>
      </form>
    </section>
  );
}
