"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type BiasInsight, type Transaction, type TransactionSummary } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";

type DashboardState = {
  transactions: Transaction[];
  insights: BiasInsight[];
  summary: TransactionSummary | null;
};

export function DashboardClient() {
  const { tokens, refreshAccessToken, user } = useAuth();
  const [state, setState] = useState<DashboardState>({ transactions: [], insights: [], summary: null });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!tokens?.accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const [transactionsResult, insightsResult, summaryResult] = await Promise.all([
          api.getTransactions(tokens.accessToken),
          api.getInsights(tokens.accessToken),
          api.getTransactionSummary(tokens.accessToken)
        ]);

        setState({
          transactions: transactionsResult.transactions,
          insights: insightsResult.insights,
          summary: summaryResult
        });
      } catch (err) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setError(err instanceof Error ? err.message : "Could not load dashboard");
          setLoading(false);
          return;
        }

        try {
          const [transactionsResult, insightsResult, summaryResult] = await Promise.all([
            api.getTransactions(refreshed),
            api.getInsights(refreshed),
            api.getTransactionSummary(refreshed)
          ]);

          setState({
            transactions: transactionsResult.transactions,
            insights: insightsResult.insights,
            summary: summaryResult
          });
        } catch (retryError) {
          setError(retryError instanceof Error ? retryError.message : "Could not load dashboard");
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [refreshAccessToken, tokens?.accessToken]);

  const latestTransactions = state.transactions.slice(0, 4);
  const strongestInsight = [...state.insights].sort((a, b) => b.percentage - a.percentage)[0];
  const categoryMax = Math.max(...(state.summary?.categoryBreakdown.map((item) => item.totalAmount) ?? [1]));
  const merchantMax = Math.max(...(state.summary?.topMerchants.map((item) => item.totalAmount) ?? [1]));
  const dailyTrendMax = Math.max(...(state.summary?.dailyTrend.map((item) => item.totalAmount) ?? [1]));
  const dailyTrendMid = dailyTrendMax / 2;
  const currency = (user?.currency as SupportedCurrency | undefined) ?? "USD";

  const formatTrendLabel = (date: string) =>
    new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      timeZone: state.summary?.timezone ?? "UTC"
    }).format(new Date(`${date}T00:00:00`));

  return (
    <RouteGuard>
      <div className="shell section dashboard-page-shell">
        <div className="section-title dashboard-page-title">
          <div>
            <h1>Dashboard</h1>
            <p className="muted">
              {user?.role === "ADMIN" ? "Admin session active." : "Your expense activity at a glance."}
            </p>
          </div>
          <div className="inline-actions">
            <Link className="button" href="/transactions">
              Add transaction
            </Link>
            <Link className="button-secondary" href="/insights">
              Review insights
            </Link>
          </div>
        </div>

        {error ? <div className="banner banner-error">{error}</div> : null}

        <div className="dashboard-grid dashboard-layout">
          <div className="metric-card span-4 dashboard-metric-card">
            <div className="metric-label">Transactions</div>
            <strong className="metric-value">{state.summary?.transactionCount ?? state.transactions.length}</strong>
            <span className="muted">Captured through the backend transaction API.</span>
          </div>

          <div className="metric-card span-4 dashboard-metric-card">
            <div className="metric-label">Total spend</div>
            <strong className="metric-value">{formatCurrency(state.summary?.totalSpend ?? 0, currency)}</strong>
            <span className="muted">Aggregated from the new summary endpoint.</span>
          </div>

          <div className="metric-card span-4 dashboard-metric-card">
            <div className="metric-label">Top signal</div>
            <strong className="metric-value">{strongestInsight ? `${strongestInsight.percentage}%` : "--"}</strong>
            <span className="muted">
              {strongestInsight
                ? `${strongestInsight.biasType} bias around ${strongestInsight.value}`
                : "No bias insight generated yet"}
            </span>
          </div>

          <div className="list-card span-7 dashboard-list-card">
            <div className="section-title">
              <h2>Recent transactions</h2>
              <Link className="ghost-link" href="/transactions">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="empty-state">Loading transactions...</div>
            ) : latestTransactions.length ? (
              <div className="data-list dashboard-scroll-list">
                {latestTransactions.map((tx) => (
                  <article className="item" key={tx._id}>
                    <div className="item-top">
                      <div>
                        <strong>{tx.merchant}</strong>
                        <div className="muted">{tx.description}</div>
                      </div>
                      <strong>{formatCurrency(tx.amount, currency)}</strong>
                    </div>
                    <div className="inline-actions">
                      <span className="pill">{tx.category}</span>
                      <span className="pill">{tx.timeBucket}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No transactions yet. Add one to start the feedback loop.</div>
            )}
          </div>

          <div className="list-card span-5 dashboard-list-card">
            <div className="section-title">
              <h2>Bias insights</h2>
              <Link className="ghost-link" href="/insights">
                Open insights
              </Link>
            </div>
            {loading ? (
              <div className="empty-state">Loading insights...</div>
            ) : state.insights.length ? (
              <div className="data-list dashboard-scroll-list">
                {state.insights.map((insight) => (
                  <article className="item" key={`${insight.biasType}-${insight.value}`}>
                    <div className="item-top">
                      <strong>{insight.biasType}</strong>
                      <span className={`pill pill-${insight.severity.toLowerCase()}`}>{insight.severity}</span>
                    </div>
                    <div>{insight.value}</div>
                    <div className="muted">{insight.percentage}% concentration in the current rule window.</div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                Insights appear after enough transaction history is available for the detector rules.
              </div>
            )}
          </div>

          <div className="list-card span-7 dashboard-chart-card">
            <div className="section-title">
              <h2>Category spend</h2>
              <span className="pill">Summary</span>
            </div>
            {state.summary?.categoryBreakdown.length ? (
              <div className="chart-list">
                {state.summary.categoryBreakdown.map((item) => (
                  <div className="chart-row" key={item.category}>
                    <div className="chart-label">
                      <strong>{item.category}</strong>
                      <span className="muted">{formatCurrency(item.totalAmount, currency)}</span>
                    </div>
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar-fill"
                        style={{ width: `${Math.max((item.totalAmount / categoryMax) * 100, 8)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No category summary yet.</div>
            )}
          </div>

          <div className="list-card span-5 dashboard-chart-card">
            <div className="section-title">
              <h2>Top merchants</h2>
              <span className="pill">Top 5</span>
            </div>
            {state.summary?.topMerchants.length ? (
              <div className="chart-list">
                {state.summary.topMerchants.map((item) => (
                  <div className="chart-row" key={item.merchant}>
                    <div className="chart-label">
                      <strong>{item.merchant}</strong>
                      <span className="muted">{item.count} tx</span>
                    </div>
                    <div className="chart-bar-track">
                      <div
                        className="chart-bar-fill chart-bar-fill-accent"
                        style={{ width: `${Math.max((item.totalAmount / merchantMax) * 100, 8)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No merchant summary yet.</div>
            )}
          </div>

          <div className="list-card span-12 dashboard-chart-card">
            <div className="section-title">
              <h2>Recent spending trend</h2>
              <span className="pill">Last 7 buckets</span>
            </div>
            {state.summary?.dailyTrend.length ? (
              <div className="trend-shell">
                <div className="trend-axis">
                  <span>{formatCurrency(dailyTrendMax, currency)}</span>
                  <span>{formatCurrency(dailyTrendMid, currency)}</span>
                  <span>{formatCurrency(0, currency)}</span>
                </div>
                <div className="trend-chart">
                  {state.summary.dailyTrend.map((point) => (
                    <div className="trend-point" key={point.date}>
                      <span className="trend-value">{formatCurrency(point.totalAmount, currency)}</span>
                      <div
                        className="trend-bar"
                        style={{ height: `${Math.max((point.totalAmount / dailyTrendMax) * 100, 12)}%` }}
                      />
                      <span className="muted">{formatTrendLabel(point.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">No trend data yet.</div>
            )}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
