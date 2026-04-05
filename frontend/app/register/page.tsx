"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const tokens = await api.register({
          ...form,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        login(tokens);
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    });
  };

  return (
    <main className="auth-shell">
      <section className="form-card auth-card">
        <h1>Register</h1>
        <p className="muted">Create a user and store the returned access and refresh tokens locally.</p>
        {error ? <div className="banner banner-error">{error}</div> : null}
        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </div>
          <button className="button" disabled={isPending} type="submit">
            {isPending ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className="footnote">
          Already registered? <Link href="/login">Login here</Link>.
        </p>
      </section>
    </main>
  );
}
