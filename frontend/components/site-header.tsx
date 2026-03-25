"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/currency";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, ready, updateCurrency } = useAuth();

  const isAuthed = ready && !!user;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleCurrencyChange = async (currency: SupportedCurrency) => {
    await updateCurrency(currency);
  };

  return (
    <header className="site-header">
      <div className="shell nav">
        <div className="brand">
          <div className="brand-badge">SE</div>
          <div className="brand-copy">
            <strong>Smart Expense</strong>
            <span>Spend tracking with pattern insight</span>
          </div>
        </div>

        <nav className="nav-links">
          {isAuthed ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/transactions">Transactions</Link>
              <Link href="/insights">Insights</Link>
              {user?.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
              <select
                aria-label="Preferred currency"
                className="nav-currency"
                value={(user?.currency as SupportedCurrency | undefined) ?? "USD"}
                onChange={(event) => void handleCurrencyChange(event.target.value as SupportedCurrency)}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
                Home
              </Link>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
