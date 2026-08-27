"use client";

import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteOwnAccount } from "@/lib/supabase/private-projects";

type AuthPanelProps = {
  onUserChange: (user: User | null) => void;
};

export default function AuthPanel({ onUserChange }: AuthPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
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

  async function deleteAccount() {
    if (!window.confirm("Möchten Sie Ihr Raumly-Konto wirklich vollständig löschen? Private Projekte und Fotos werden unwiderruflich entfernt.")) return;
    setBusy(true);
    setMessage("");
    try {
      await deleteOwnAccount(supabase);
      setMessage("Ihr Konto und die privaten Daten wurden gelöscht.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Das Konto konnte nicht vollständig gelöscht werden.");
    } finally {
      setBusy(false);
    }
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
      {user ? (
        <div className="auth-session">
          <span>Angemeldet als</span>
          <strong>{user.email}</strong>
          <button type="button" onClick={signOut} disabled={busy}>Abmelden</button>
          <button className="delete-account" type="button" onClick={deleteAccount} disabled={busy}>Konto und private Daten löschen</button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="account-email">E-Mail-Adresse</label>
          <input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="account-password">Passwort</label>
          <input id="account-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="submit" disabled={busy}>{busy ? "Bitte warten …" : mode === "signup" ? "Konto anlegen" : "Anmelden"}</button>
          <button className="auth-mode" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
            {mode === "signin" ? "Noch kein Konto? Registrieren" : "Bereits registriert? Anmelden"}
          </button>
        </form>
      )}
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  );
}
