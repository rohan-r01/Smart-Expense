"use client";

import { useEffect, useState, useTransition } from "react";
import { api, type BiasInsight } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";

export function InsightsClient() {
  const { tokens, refreshAccessToken } = useAuth();
  const [insights, setInsights] = useState<BiasInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadInsights = async (accessToken: string) => {
    const result = await api.getInsights(accessToken);
    setInsights(result.insights);
  };

  useEffect(() => {
    const load = async () => {
      if (!tokens?.accessToken) return;

      setLoading(true);
      setError(null);

      try {
        await loadInsights(tokens.accessToken);
      } catch {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setError("Could not fetch insights.");
        } else {
          await loadInsights(refreshed).catch(() => {
            setError("Could not fetch insights.");
          });
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [refreshAccessToken, tokens?.accessToken]);

  const generate = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const accessToken = tokens?.accessToken ?? (await refreshAccessToken());
      if (!accessToken) {
        setError("Your session expired. Please log in again.");
        return;
      }

      try {
        const result = await api.generateInsights(accessToken);
        setInsights(result.insights);
        setMessage(
          result.insights.length
            ? "Insights regenerated from current transactions."
            : "No insight met the detector thresholds yet."
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not generate insights.");
      }
    });
  };

  return (
    <RouteGuard>
      <div className="shell section insights-page-shell">
        <div className="section-title insights-page-title">
          <div>
            <h1>Insights</h1>
            <p className="muted">Rule-based bias patterns generated from your transaction history.</p>
          </div>
          <button className="button" disabled={isPending} type="button" onClick={generate}>
            {isPending ? "Generating..." : "Generate insights"}
          </button>
        </div>

        {error ? <div className="banner banner-error">{error}</div> : null}
        {message ? <div className="banner banner-success">{message}</div> : null}

        <div className="insights-grid insights-layout">
          <section className="list-card span-12 insights-list-card">
            {loading ? (
              <div className="empty-state">Loading insight history...</div>
            ) : insights.length ? (
              <div className="data-list insights-list">
                {insights.map((insight) => (
                  <article className="item" key={`${insight.biasType}-${insight.value}`}>
                    <div className="item-top">
                      <div>
                        <strong>{insight.biasType} bias</strong>
                        <div className="muted">Detected around {insight.value}</div>
                      </div>
                      <span className={`pill pill-${insight.severity.toLowerCase()}`}>{insight.severity}</span>
                    </div>
                    <div>{insight.percentage}% concentration during {insight.period.replaceAll("_", " ").toLowerCase()}.</div>
                    <div className="inline-actions">
                      <span className="pill">{insight.generatedFrom ?? "RULE_ENGINE"}</span>
                      <span className="pill">{insight.value}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                Your backend currently requires a healthy amount of transaction history before emitting insights.
              </div>
            )}
          </section>
        </div>
      </div>
    </RouteGuard>
  );
}
