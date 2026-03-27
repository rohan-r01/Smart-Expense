"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { api, type BiasInsight, type Budget, type Transaction, type TransactionSummary } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";
import { useToast } from "@/components/toast-provider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type DashboardState = {
  transactions: Transaction[];
  insights: BiasInsight[];
  summary: TransactionSummary | null;
  budgets: Budget[];
};

export function DashboardClient() {
  const { tokens, refreshAccessToken, user } = useAuth();
  const { showToast } = useToast();
  const [state, setState] = useState<DashboardState>({ transactions: [], insights: [], summary: null, budgets: [] });
  const [budgetForm, setBudgetForm] = useState({ category: "FOOD" as Transaction["category"], limitAmount: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      if (!tokens?.accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const [transactionsResult, insightsResult, summaryResult, budgetsResult] = await Promise.all([
          api.getTransactions(tokens.accessToken),
          api.getInsights(tokens.accessToken),
          api.getTransactionSummary(tokens.accessToken),
          api.getBudgets(tokens.accessToken)
        ]);

        setState({
          transactions: transactionsResult.transactions,
          insights: insightsResult.insights,
          summary: summaryResult,
          budgets: budgetsResult.budgets
        });
      } catch (err) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setError(err instanceof Error ? err.message : "Could not load dashboard");
          setLoading(false);
          return;
        }

        try {
          const [transactionsResult, insightsResult, summaryResult, budgetsResult] = await Promise.all([
            api.getTransactions(refreshed),
            api.getInsights(refreshed),
            api.getTransactionSummary(refreshed),
            api.getBudgets(refreshed)
          ]);

          setState({
            transactions: transactionsResult.transactions,
            insights: insightsResult.insights,
            summary: summaryResult,
            budgets: budgetsResult.budgets
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
  const currency = (user?.currency as SupportedCurrency | undefined) ?? "USD";
  const budgetUsageMax = Math.max(...(state.summary?.budgetProgress.map((item) => item.usageRatio) ?? [1]));

  const formatTrendLabel = (date: string) =>
    new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      timeZone: state.summary?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(new Date(`${date}T00:00:00`));

  const trendData =
    state.summary?.dailyTrend.map((point) => ({
      ...point,
      label: formatTrendLabel(point.date)
    })) ?? [];

  const formatCompactCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);

  const formatTooltipValue = (value: number | string | readonly (number | string)[] | undefined) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    return formatCurrency(typeof normalized === "number" ? normalized : Number(normalized ?? 0), currency);
  };

  const saveBudget = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const accessToken = tokens?.accessToken ?? (await refreshAccessToken());
      if (!accessToken) {
        setError("Your session expired. Please log in again.");
        return;
      }

      try {
        await api.upsertBudget(accessToken, budgetForm.category, Number(budgetForm.limitAmount));
        const [summaryResult, budgetsResult] = await Promise.all([
          api.getTransactionSummary(accessToken),
          api.getBudgets(accessToken)
        ]);
        setState((current) => ({
          ...current,
          summary: summaryResult,
          budgets: budgetsResult.budgets
        }));
        setBudgetForm((current) => ({ ...current, limitAmount: "" }));
        showToast("Budget saved.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save budget.");
      }
    });
  };

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

          <div className="list-card span-7 dashboard-chart-card">
            <div className="section-title">
              <h2>Budgets by category</h2>
              <span className="pill">{state.summary?.budgetProgress.length ?? 0} active</span>
            </div>
            <form className="form-grid dashboard-budget-form" onSubmit={saveBudget}>
              <div className="field">
                <label htmlFor="budgetCategory">Category</label>
                <select
                  id="budgetCategory"
                  value={budgetForm.category}
                  onChange={(event) =>
                    setBudgetForm((current) => ({
                      ...current,
                      category: event.target.value as Transaction["category"]
                    }))
                  }
                >
                  <option value="FOOD">Food</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="ENTERTAINMENT">Entertainment</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="budgetLimit">Limit</label>
                <input
                  id="budgetLimit"
                  min="0"
                  placeholder="400"
                  step="0.01"
                  type="number"
                  value={budgetForm.limitAmount}
                  onChange={(event) => setBudgetForm((current) => ({ ...current, limitAmount: event.target.value }))}
                />
              </div>
              <div className="inline-actions compact-actions">
                <button className="button-secondary" disabled={isPending} type="submit">
                  {isPending ? "Saving..." : "Save budget"}
                </button>
              </div>
            </form>
            {state.summary?.budgetProgress.length ? (
              <div className="chart-list">
                {state.summary.budgetProgress.map((item) => (
                  <div className="chart-row" key={item.category}>
                    <div className="chart-label">
                      <strong>{item.category}</strong>
                      <span className="muted">
                        {formatCurrency(item.spentAmount, currency)} / {formatCurrency(item.limitAmount, currency)}
                      </span>
                    </div>
                    <div className="chart-bar-track">
                      <div
                        className={`chart-bar-fill ${
                          item.status === "EXCEEDED" ? "chart-bar-fill-danger" : item.status === "WARNING" ? "chart-bar-fill-accent" : ""
                        }`}
                        style={{ width: `${Math.max((item.usageRatio / budgetUsageMax) * 100, 8)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No budgets yet. Set a category limit to start tracking it.</div>
            )}
          </div>

          <div className="list-card span-5 dashboard-chart-card">
            <div className="section-title">
              <h2>Recurring merchants</h2>
              <span className="pill">Auto-detected</span>
            </div>
            {state.summary?.recurringMerchants.length ? (
              <div className="data-list">
                {state.summary.recurringMerchants.map((item) => (
                  <article className="item" key={`${item.merchant}-${item.amount}`}>
                    <div className="item-top">
                      <strong>{item.merchant}</strong>
                      <span className="pill pill-low">{item.occurrences} repeats</span>
                    </div>
                    <div className="muted">{formatCurrency(item.amount, currency)} recurring amount pattern</div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Recurring merchants appear after the same merchant and amount repeat.</div>
            )}
          </div>

          <div className="list-card span-12 dashboard-chart-card">
            <div className="section-title">
              <h2>Recent spending trend</h2>
              <span className="pill">Last 7 buckets</span>
            </div>
            {trendData.length ? (
              <div className="trend-chart-card-shell">
                <ResponsiveContainer height={280} width="100%">
                  <BarChart data={trendData} margin={{ top: 16, right: 12, left: 12, bottom: 8 }}>
                    <CartesianGrid stroke="rgba(29, 36, 31, 0.12)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="label"
                      tick={{ fill: "#58645b", fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      tick={{ fill: "#58645b", fontSize: 12 }}
                      tickFormatter={(value: number) => formatCompactCurrency(value)}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255, 250, 241, 0.98)",
                        border: "1px solid rgba(29, 36, 31, 0.12)",
                        borderRadius: "16px"
                      }}
                      cursor={false}
                      formatter={(value) => formatTooltipValue(value)}
                      labelStyle={{ color: "#1d241f", fontWeight: 600 }}
                    />
                    <Bar dataKey="totalAmount" fill="#0f766e" radius={[8, 8, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state">No trend data yet.</div>
            )}
          </div>

          <div className="list-card span-12 dashboard-chart-card">
            <div className="section-title">
              <h2>Potential duplicates</h2>
              <span className="pill">Review</span>
            </div>
            {state.summary?.duplicateCandidates.length ? (
              <div className="data-list">
                {state.summary.duplicateCandidates.map((item) => (
                  <article className="item" key={`${item.merchant}-${item.amount}-${item.transactionDate}`}>
                    <div className="item-top">
                      <strong>{item.merchant}</strong>
                      <span className="pill pill-medium">{item.occurrences} matches</span>
                    </div>
                    <div className="muted">
                      {formatCurrency(item.amount, currency)} on {item.transactionDate}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No duplicate candidates were found.</div>
            )}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
