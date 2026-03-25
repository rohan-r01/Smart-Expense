"use client";

import { useEffect, useState, useTransition } from "react";
import { api, type Transaction, type TransactionFilters } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";

const initialForm = {
  amount: "",
  merchant: "",
  description: "",
  transactionDate: "",
  category: "OTHER" as Transaction["category"],
  saveAsRule: false,
  ruleKeyword: ""
};

const initialFilters: TransactionFilters = {
  category: "",
  timeBucket: "",
  merchant: "",
  startDate: "",
  endDate: ""
};

export function TransactionsClient() {
  const { tokens, refreshAccessToken, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const currency = (user?.currency as SupportedCurrency | undefined) ?? "USD";

  const loadTransactions = async (accessToken: string, activeFilters: TransactionFilters = filters) => {
    const result = await api.getTransactions(accessToken, activeFilters);
    setTransactions(result.transactions);
  };

  useEffect(() => {
    const load = async () => {
      if (!tokens?.accessToken) return;

      setLoading(true);
      setError(null);

      try {
        await loadTransactions(tokens.accessToken, filters);
      } catch {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setError("Could not fetch transactions.");
        } else {
          await loadTransactions(refreshed, filters).catch(() => {
            setError("Could not fetch transactions.");
          });
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [filters, refreshAccessToken, tokens?.accessToken]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const beginEdit = (transaction: Transaction) => {
    setEditingId(transaction._id);
    setForm({
      amount: transaction.amount.toString(),
      merchant: transaction.merchant,
      description: transaction.description,
      transactionDate: new Date(transaction.transactionDate).toISOString().slice(0, 16),
      category: transaction.category,
      saveAsRule: false,
      ruleKeyword: transaction.merchant.toLowerCase()
    });
    setSuccess(null);
    setError(null);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const accessToken = tokens?.accessToken ?? (await refreshAccessToken());
      if (!accessToken) {
        setError("Your session expired. Please log in again.");
        return;
      }

      try {
        if (editingId) {
          await api.updateTransaction(accessToken, editingId, {
            amount: Number(form.amount),
            merchant: form.merchant,
            description: form.description,
            transactionDate: form.transactionDate,
            category: form.category,
            saveAsRule: form.saveAsRule,
            ruleKeyword: form.ruleKeyword
          });
          setSuccess(
            form.saveAsRule
              ? "Transaction updated, insights refreshed, and a reusable category rule was saved."
              : "Transaction updated and insights refreshed."
          );
        } else {
          await api.createTransaction(accessToken, {
            amount: Number(form.amount),
            merchant: form.merchant,
            description: form.description,
            transactionDate: form.transactionDate
          });
          setSuccess("Transaction created and backend insight generation triggered.");
        }

        await loadTransactions(accessToken, filters);
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save transaction.");
      }
    });
  };

  const removeTransaction = (transactionId: string) => {
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const accessToken = tokens?.accessToken ?? (await refreshAccessToken());
      if (!accessToken) {
        setError("Your session expired. Please log in again.");
        return;
      }

      try {
        await api.deleteTransaction(accessToken, transactionId);
        await loadTransactions(accessToken, filters);
        if (editingId === transactionId) {
          resetForm();
        }
        setSuccess("Transaction deleted and insights refreshed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete transaction.");
      }
    });
  };

  return (
    <RouteGuard>
      <div className="shell section transactions-page-shell">
        <div className="section-title transactions-page-title">
          <div>
            <h1>Transactions</h1>
            <p className="muted">Create, filter, edit, and delete transactions with live recategorization.</p>
          </div>
        </div>

        <div className="dashboard-grid transactions-layout">
          <section className="form-card span-5 transactions-form-card">
            <h2>{editingId ? "Edit transaction" : "New transaction"}</h2>
            <p className="muted">
              {editingId ? "Update the record and refresh its categorization." : "Post directly to `/api/transactions` with your bearer token."}
            </p>

            {error ? <div className="banner banner-error">{error}</div> : null}
            {success ? <div className="banner banner-success">{success}</div> : null}

            <form className="form-grid transactions-form-grid" onSubmit={submit}>
              <div className="field">
                <label htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  min="0"
                  name="amount"
                  placeholder="45.50"
                  step="0.01"
                  type="number"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </div>

              <div className="field">
                <label htmlFor="merchant">Merchant</label>
                <input
                  id="merchant"
                  name="merchant"
                  placeholder="Uber, Netflix, Zomato..."
                  type="text"
                  value={form.merchant}
                  onChange={(event) => setForm((current) => ({ ...current, merchant: event.target.value }))}
                />
              </div>

              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Short context for this expense"
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>

              <div className="field">
                <label htmlFor="transactionDate">Transaction date</label>
                <input
                  id="transactionDate"
                  name="transactionDate"
                  type="datetime-local"
                  value={form.transactionDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, transactionDate: event.target.value }))
                  }
                />
              </div>

              {editingId ? (
                <>
                  <div className="field">
                    <label htmlFor="category">Correct category</label>
                    <select
                      id="category"
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
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
                    <label htmlFor="ruleKeyword">Keyword to learn</label>
                    <input
                      id="ruleKeyword"
                      placeholder="Usually the merchant name"
                      type="text"
                      value={form.ruleKeyword}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, ruleKeyword: event.target.value }))
                      }
                    />
                  </div>

                  <label className="toggle-row">
                    <input
                      checked={form.saveAsRule}
                      type="checkbox"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, saveAsRule: event.target.checked }))
                      }
                    />
                    <span>Create or update a reusable category rule from this correction</span>
                  </label>
                </>
              ) : null}

              <div className="inline-actions compact-actions">
                <button className="button" disabled={isPending} type="submit">
                  {isPending ? "Saving..." : editingId ? "Update transaction" : "Save transaction"}
                </button>
                {editingId ? (
                  <button className="button-secondary" type="button" onClick={resetForm}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="list-card span-7 transactions-history-card">
            <div className="section-title">
              <h2>Transaction history</h2>
              <span className="pill">{transactions.length} entries</span>
            </div>

            <div className="form-grid transactions-filter-grid">
              <div className="field">
                <label htmlFor="merchantFilter">Merchant search</label>
                <input
                  id="merchantFilter"
                  placeholder="Search merchant"
                  type="text"
                  value={filters.merchant ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, merchant: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="categoryFilter">Category</label>
                <select
                  id="categoryFilter"
                  value={filters.category ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="">All categories</option>
                  <option value="FOOD">Food</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="ENTERTAINMENT">Entertainment</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="timeBucketFilter">Time bucket</label>
                <select
                  id="timeBucketFilter"
                  value={filters.timeBucket ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, timeBucket: event.target.value }))}
                >
                  <option value="">All time buckets</option>
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="NIGHT">Night</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="startDateFilter">Start date</label>
                <input
                  id="startDateFilter"
                  type="date"
                  value={filters.startDate ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="endDateFilter">End date</label>
                <input
                  id="endDateFilter"
                  type="date"
                  value={filters.endDate ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                />
              </div>
              <div className="inline-actions compact-actions">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => setFilters(initialFilters)}
                >
                  Clear filters
                </button>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">Loading transaction history...</div>
            ) : transactions.length ? (
              <div className="data-list transactions-history-list">
                {transactions.map((tx) => (
                  <article className="item" key={tx._id}>
                    <div className="item-top">
                      <div>
                        <strong>{tx.merchant}</strong>
                        <div className="muted">{new Date(tx.transactionDate).toLocaleString()}</div>
                      </div>
                      <strong>{formatCurrency(tx.amount, currency)}</strong>
                    </div>
                    <div>{tx.description}</div>
                    <div className="inline-actions">
                      <span className="pill">{tx.category}</span>
                      <span className="pill">{Math.round(tx.categoryConfidence * 100)}% confidence</span>
                      <span className="pill">{tx.timeBucket}</span>
                    </div>
                    <div className="footnote">{tx.categorizationReason}</div>
                    <div className="inline-actions compact-actions transaction-row-actions">
                      <button className="button-secondary transaction-row-button" type="button" onClick={() => beginEdit(tx)}>
                        Edit
                      </button>
                      <button className="button-danger transaction-row-button" type="button" onClick={() => removeTransaction(tx._id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No transactions match your current filters.</div>
            )}
          </section>
        </div>
      </div>
    </RouteGuard>
  );
}
