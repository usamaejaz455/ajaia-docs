"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./api";

type U = { id: string; email: string; name: string };

export default function LoginOptions({ users }: { users: U[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(id: string) {
    setPending(id);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ userId: id }) });
      router.replace("/docs");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(null);
    }
  }

  return (
    <div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {users.map((u) => (
        <button key={u.id} className="user-option" onClick={() => signIn(u.id)} disabled={pending !== null}>
          <span>{pending === u.id ? "Signing in…" : `Continue as ${u.name}`}</span>
          <span>{u.email}</span>
        </button>
      ))}
    </div>
  );
}
