"use client";

import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  cancelAccountDeletion,
  readAccountDeletionRequest,
  requestAccountDeletion,
} from "@/lib/supabase/account-deletion";
import type { AccountDeletionRequest } from "@/lib/supabase/account-deletion";

type AuthPanelProps = {
  onUserChange: (user: User | null) => void;
  onDeletionRequestChange: (request: AccountDeletionRequest | null) => void;
};

export default function AuthPanel({ onUserChange, onDeletionRequestChange }: AuthPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "update">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);

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
      if (!session?.user) {
        setDeletionRequest(null);
        onDeletionRequestChange(null);
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [onDeletionRequestChange, onUserChange, supabase]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    readAccountDeletionRequest(supabase).then((request) => {
      if (!active) return;
      setDeletionRequest(request);
      onDeletionRequestChange(request);
    }).catch((loadError) => {
      if (!active) return;
      setMessage(loadError instanceof Error ? loadError.message : "Der Kontostatus konnte nicht geladen werden.");
    });
    return () => { active = false; };
  }, [onDeletionRequestChange, supabase, user]);

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

  async function requestDeletion() {
    if (!window.confirm("Möchten Sie die Löschung Ihres Kontos beantragen? Die normale Nutzung wird gesperrt. Sie können den Antrag innerhalb von 14 Tagen widerrufen.")) return;
    setBusy(true);
    setMessage("");
    try {
      const request = await requestAccountDeletion(supabase);
      setDeletionRequest(request);
      onDeletionRequestChange(request);
      setMessage("Die Kontolöschung wurde vorgemerkt.");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Die Kontolöschung konnte nicht vorgemerkt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDeletion() {
    setBusy(true);
    setMessage("");
    try {
      await cancelAccountDeletion(supabase);
      setDeletionRequest(null);
      onDeletionRequestChange(null);
      setMessage("Die Kontolöschung wurde widerrufen. Ihr Konto ist wieder normal nutzbar.");
    } catch (cancelError) {
      setMessage(cancelError instanceof Error ? cancelError.message : "Die Kontolöschung konnte nicht widerrufen werden.");
    } finally {
      setBusy(false);
    }
  }

  const deletionDate = deletionRequest
    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short" }).format(new Date(deletionRequest.deleteAfter))
    : "";

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
      ) : user && deletionRequest ? (
        <div className="auth-session deletion-pending" role="status">
          <span>Kontolöschung vorgemerkt</span>
          <strong>Endgültige Löschung frühestens am {deletionDate}</strong>
          <p>Ihr Konto ist bis dahin für die normale Nutzung gesperrt.</p>
          <button type="button" onClick={cancelDeletion} disabled={busy}>{busy ? "Bitte warten …" : "Kontolöschung widerrufen"}</button>
          <button type="button" onClick={signOut} disabled={busy}>Abmelden</button>
        </div>
      ) : user ? (
        <div className="auth-session">
          <span>Angemeldet als</span>
          <strong>{user.email}</strong>
          <button type="button" onClick={signOut} disabled={busy}>Abmelden</button>
          <button className="delete-account" type="button" onClick={requestDeletion} disabled={busy}>Kontolöschung beantragen</button>
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
