"use client";

import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthPanelProps = {
  onUserChange: (user: User | null) => void;
};

export default function AuthPanel({ onUserChange }: AuthPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "update">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      onUserChange(data.user);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        setMode("update");
        setMessage("Bitte legen Sie jetzt ein neues Passwort fest.");
      }
      setUser(session?.user ?? null);
      onUserChange(session?.user ?? null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [onUserChange, supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      setBusy(false);
      setMessage(error ? error.message : "Wir haben Ihnen einen Link zum Zurücksetzen des Passworts geschickt.");
      return;
    }
    if (mode === "update") {
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      setPassword("");
      setMode("signin");
      setMessage("Ihr Passwort wurde erfolgreich geändert.");
      return;
    }
    const credentials = { email: email.trim(), password };
    const result = mode === "signup"
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials);
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setPassword("");
    setMessage(mode === "signup" && !result.data.session
      ? "Bitte bestätigen Sie Ihre E-Mail-Adresse."
      : "Anmeldung erfolgreich.");
  }

  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setMessage(error ? error.message : "Sie sind abgemeldet.");
  }

  return (
    <section className="auth-panel" aria-labelledby="account-title">
      <div>
        <small>PRIVATER BEREICH</small>
        <h2 id="account-title">Ihr Raumly-Konto</h2>
        <p>{user
          ? "Sie sind angemeldet. Projekte und Fotos werden privat Ihrem Konto zugeordnet."
          : "Melden Sie sich an, damit Projekte und Fotos später sicher Ihrem Konto zugeordnet werden können."}</p>
      </div>
      {mode === "update" ? (
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="account-password">Neues Passwort</label>
          <input id="account-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="submit" disabled={busy}>{busy ? "Bitte warten …" : "Neues Passwort speichern"}</button>
        </form>
      ) : user ? (
        <div className="auth-session">
          <span>Angemeldet als</span>
          <strong>{user.email}</strong>
          <button type="button" onClick={signOut} disabled={busy}>Abmelden</button>
          <button className="delete-account" type="button" disabled title="Die bestätigte 14-Tage-Widerrufsfrist wird noch umgesetzt.">Kontolöschung mit 14-Tage-Frist folgt</button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="account-email">E-Mail-Adresse</label>
          <input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          {mode !== "reset" && <><label htmlFor="account-password">Passwort</label>
          <input id="account-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></>}
          <button type="submit" disabled={busy}>{busy ? "Bitte warten …" : mode === "signup" ? "Konto anlegen" : mode === "reset" ? "Link zum Zurücksetzen senden" : "Anmelden"}</button>
          {mode === "signin" ? <>
            <button className="auth-mode" type="button" onClick={() => { setMode("signup"); setMessage(""); }}>Noch kein Konto? Registrieren</button>
            <button className="auth-mode" type="button" onClick={() => { setMode("reset"); setMessage(""); }}>Passwort vergessen?</button>
          </> : <button className="auth-mode" type="button" onClick={() => { setMode("signin"); setMessage(""); }}>Zurück zur Anmeldung</button>}
        </form>
      )}
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  );
}
