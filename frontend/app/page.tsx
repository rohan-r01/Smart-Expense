import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="shell hero landing-hero">
        <div className="panel hero-copy">
          <span className="eyebrow">Next.js frontend for your Express + Mongo backend</span>
          <h1 className="display" style={{ fontFamily: "var(--font-display)" }}>
            See spend patterns before they become habits.
          </h1>
          <p className="lead">
            This frontend is shaped around your existing auth, transactions, insights, and admin endpoints. It is
            intentionally built as a separate app so the backend stays focused on API logic.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/register">
              Create account
            </Link>
            <Link className="button-secondary" href="/login">
              Login
            </Link>
          </div>
        </div>

        <aside className="panel hero-side">
          <div className="mini-stat">
            <strong>Auth</strong>
            <span>Register, login, refresh, and logout mapped to your existing token flow.</span>
          </div>
          <div className="mini-stat">
            <strong>Transactions</strong>
            <span>Transaction creation feeds straight into categorization and automatic insight generation.</span>
          </div>
          <div className="mini-stat">
            <strong>Insights + Admin</strong>
            <span>Protected pages surface user bias insights and the admin user listing endpoint.</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
