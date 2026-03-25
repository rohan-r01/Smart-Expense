"use client";

import { useEffect, useState, useTransition } from "react";
import { api, type AdminUser, type CategoryRule } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";

type RulePreset = "high_specific" | "standard" | "fallback" | "custom";

const RULE_PRESETS: Record<
  Exclude<RulePreset, "custom">,
  { confidence: string; priority: string; label: string; help: string }
> = {
  high_specific: {
    confidence: "0.95",
    priority: "15",
    label: "High certainty",
    help: "Use for very specific merchants like Netflix or Uber Eats."
  },
  standard: {
    confidence: "0.85",
    priority: "8",
    label: "Standard rule",
    help: "Use for reliable merchant/category matches that are not ultra-specific."
  },
  fallback: {
    confidence: "0.65",
    priority: "2",
    label: "Fallback rule",
    help: "Use for broader keywords that should only apply when nothing more specific matches."
  }
};

function inferPreset(confidence: number, priority: number): RulePreset {
  if (confidence === 0.95 && priority === 15) return "high_specific";
  if (confidence === 0.85 && priority === 8) return "standard";
  if (confidence === 0.65 && priority === 2) return "fallback";
  return "custom";
}

const initialRuleForm = {
  keyword: "",
  category: "FOOD" as CategoryRule["category"],
  preset: "standard" as RulePreset,
  confidence: RULE_PRESETS.standard.confidence,
  priority: RULE_PRESETS.standard.priority,
  active: true
};

export function AdminClient() {
  const { tokens, refreshAccessToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [ruleForm, setRuleForm] = useState(initialRuleForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      if (!tokens?.accessToken) return;

      setLoading(true);
      setError(null);

      const loadEverything = async (accessToken: string) => {
        const [usersResult, rulesResult] = await Promise.all([
          api.getUsers(accessToken, {
            search,
            role: roleFilter,
            sort
          }),
          api.getCategoryRules(accessToken)
        ]);

        setUsers(usersResult.users);
        setRules(rulesResult.rules);
      };

      try {
        await loadEverything(tokens.accessToken);
      } catch {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setError("Could not fetch admin data.");
        } else {
          await loadEverything(refreshed).catch(() => {
            setError("Could not fetch admin data.");
          });
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [refreshAccessToken, roleFilter, search, sort, tokens?.accessToken]);

  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  const activeRuleCount = rules.filter((rule) => rule.active).length;

  const withAccessToken = async <T,>(action: (accessToken: string) => Promise<T>) => {
    const accessToken = tokens?.accessToken ?? (await refreshAccessToken());
    if (!accessToken) {
      throw new Error("Your session expired. Please log in again.");
    }
    return action(accessToken);
  };

  const resetRuleForm = () => {
    setRuleForm(initialRuleForm);
    setEditingRuleId(null);
  };

  const updateRole = (userId: string, role: "USER" | "ADMIN") => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = await withAccessToken((accessToken) => api.updateUserRole(accessToken, userId, role));
        setUsers((current) => current.map((user) => (user._id === userId ? result.user : user)));
        setSuccess(`Updated role to ${role}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update role.");
      }
    });
  };

  const beginRuleEdit = (rule: CategoryRule) => {
    setEditingRuleId(rule._id);
    setRuleForm({
      keyword: rule.keyword,
      category: rule.category,
      preset: inferPreset(rule.confidence, rule.priority),
      confidence: String(rule.confidence),
      priority: String(rule.priority),
      active: rule.active
    });
    setSuccess(null);
    setError(null);
  };

  const submitRule = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const presetValues =
          ruleForm.preset === "custom"
            ? { confidence: ruleForm.confidence, priority: ruleForm.priority }
            : RULE_PRESETS[ruleForm.preset];

        const payload = {
          keyword: ruleForm.keyword,
          category: ruleForm.category,
          confidence: Number(presetValues.confidence),
          priority: Number(presetValues.priority),
          active: ruleForm.active
        };

        if (editingRuleId) {
          const result = await withAccessToken((accessToken) =>
            api.updateCategoryRule(accessToken, editingRuleId, payload)
          );
          setRules((current) => current.map((rule) => (rule._id === editingRuleId ? result.rule : rule)));
          setSuccess("Category rule updated.");
        } else {
          const result = await withAccessToken((accessToken) => api.createCategoryRule(accessToken, payload));
          setRules((current) => [result.rule, ...current]);
          setSuccess("Category rule created.");
        }

        resetRuleForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save category rule.");
      }
    });
  };

  const deleteRule = (ruleId: string) => {
    const confirmed = window.confirm("Delete this category rule?");
    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await withAccessToken((accessToken) => api.deleteCategoryRule(accessToken, ruleId));
        setRules((current) => current.filter((rule) => rule._id !== ruleId));
        if (editingRuleId === ruleId) {
          resetRuleForm();
        }
        setSuccess("Category rule deleted.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete category rule.");
      }
    });
  };

  return (
    <RouteGuard requireAdmin>
      <div className="shell section admin-page-shell">
        <div className="section-title admin-page-title">
          <div>
            <h1>Admin</h1>
            <p className="muted">Manage users and grow the category-rule system beyond the original seed data.</p>
          </div>
        </div>

        {error ? <div className="banner banner-error">{error}</div> : null}
        {success ? <div className="banner banner-success">{success}</div> : null}

        <div className="dashboard-grid admin-summary-grid">
          <div className="metric-card span-3 admin-metric-card">
            <div className="metric-label">Visible users</div>
            <strong className="metric-value">{users.length}</strong>
            <span className="muted">Filtered result set.</span>
          </div>
          <div className="metric-card span-3 admin-metric-card">
            <div className="metric-label">Admins</div>
            <strong className="metric-value">{adminCount}</strong>
            <span className="muted">Admin accounts in the visible list.</span>
          </div>
          <div className="metric-card span-3 admin-metric-card">
            <div className="metric-label">Rules</div>
            <strong className="metric-value">{rules.length}</strong>
            <span className="muted">Known categorization rules.</span>
          </div>
          <div className="metric-card span-3 admin-metric-card">
            <div className="metric-label">Active rules</div>
            <strong className="metric-value">{activeRuleCount}</strong>
            <span className="muted">Rules currently applied.</span>
          </div>
        </div>

        <div className="list-card admin-toolbar-card">
          <div className="admin-toolbar-grid">
            <div className="field">
              <label htmlFor="adminSearch">Search email</label>
              <input
                id="adminSearch"
                placeholder="Search by email"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="adminRoleFilter">Role filter</label>
              <select
                id="adminRoleFilter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="">All roles</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="adminSort">Sort</label>
              <select
                id="adminSort"
                value={sort}
                onChange={(event) => setSort(event.target.value as "newest" | "oldest")}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            <div className="inline-actions compact-actions admin-toolbar-actions">
              <button
                className="button-secondary"
                type="button"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("");
                  setSort("newest");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="admin-grid">
          <section className="list-card span-12 admin-list-card">
            <div className="section-title">
              <h2>Users</h2>
              <span className="pill">{users.length} results</span>
            </div>
            {loading ? (
              <div className="empty-state">Loading users...</div>
            ) : users.length ? (
              <div className="data-list admin-scroll-list">
                {users.map((user) => (
                  <article className="item" key={user._id}>
                    <div className="item-top">
                      <div>
                        <strong>{user.email}</strong>
                        <div className="muted">Created {new Date(user.createdAt).toLocaleString()}</div>
                      </div>
                      <span className="pill">{user.role}</span>
                    </div>
                    <div className="inline-actions compact-actions admin-user-actions">
                      <button
                        className={`${user.role === "USER" ? "button-secondary" : "button"} admin-user-button`}
                        disabled={isPending || user.role === "USER"}
                        type="button"
                        onClick={() => updateRole(user._id, "USER")}
                      >
                        Set user
                      </button>
                      <button
                        className={`${user.role === "ADMIN" ? "button" : "button-secondary"} admin-user-button`}
                        disabled={isPending || user.role === "ADMIN"}
                        type="button"
                        onClick={() => updateRole(user._id, "ADMIN")}
                      >
                        Set admin
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No users match the current filters.</div>
            )}
          </section>

          <section className="form-card span-4 admin-rule-form-card">
            <div className="admin-rule-form-scroll">
              <h2>{editingRuleId ? "Edit category rule" : "New category rule"}</h2>
              <p className="muted">Add real merchant keywords as users teach you what belongs in each category.</p>

              <form className="form-grid" onSubmit={submitRule}>
                <div className="field">
                  <label htmlFor="ruleKeyword">Keyword</label>
                  <input
                    id="ruleKeyword"
                    placeholder="careem, talabat, metro..."
                    type="text"
                    value={ruleForm.keyword}
                    onChange={(event) => setRuleForm((current) => ({ ...current, keyword: event.target.value }))}
                  />
                </div>

                <div className="field">
                  <label htmlFor="ruleCategory">Category</label>
                  <select
                    id="ruleCategory"
                    value={ruleForm.category}
                    onChange={(event) =>
                      setRuleForm((current) => ({
                        ...current,
                        category: event.target.value as CategoryRule["category"]
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
                  <label htmlFor="rulePreset">Rule strength</label>
                  <select
                    id="rulePreset"
                    value={ruleForm.preset}
                    onChange={(event) => {
                      const preset = event.target.value as RulePreset;
                      setRuleForm((current) => ({
                        ...current,
                        preset,
                        confidence: preset === "custom" ? current.confidence : RULE_PRESETS[preset].confidence,
                        priority: preset === "custom" ? current.priority : RULE_PRESETS[preset].priority
                      }));
                    }}
                  >
                    <option value="high_specific">{RULE_PRESETS.high_specific.label}</option>
                    <option value="standard">{RULE_PRESETS.standard.label}</option>
                    <option value="fallback">{RULE_PRESETS.fallback.label}</option>
                    <option value="custom">Custom</option>
                  </select>
                  <span className="field-hint">
                    {ruleForm.preset === "custom"
                      ? "Use custom values only when you need precise control."
                      : RULE_PRESETS[ruleForm.preset].help}
                  </span>
                </div>

                {ruleForm.preset === "custom" ? (
                  <>
                    <div className="field">
                      <label htmlFor="ruleConfidence">Confidence</label>
                      <input
                        id="ruleConfidence"
                        max="1"
                        min="0"
                        step="0.01"
                        type="number"
                        value={ruleForm.confidence}
                        onChange={(event) =>
                          setRuleForm((current) => ({ ...current, confidence: event.target.value }))
                        }
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="rulePriority">Priority</label>
                      <input
                        id="rulePriority"
                        step="1"
                        type="number"
                        value={ruleForm.priority}
                        onChange={(event) =>
                          setRuleForm((current) => ({ ...current, priority: event.target.value }))
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="preset-summary">
                    <span className="pill">Confidence {RULE_PRESETS[ruleForm.preset].confidence}</span>
                    <span className="pill">Priority {RULE_PRESETS[ruleForm.preset].priority}</span>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="ruleActive">Status</label>
                  <select
                    id="ruleActive"
                    value={ruleForm.active ? "active" : "inactive"}
                    onChange={(event) =>
                      setRuleForm((current) => ({ ...current, active: event.target.value === "active" }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="inline-actions compact-actions">
                  <button className="button" disabled={isPending} type="submit">
                    {editingRuleId ? "Update rule" : "Create rule"}
                  </button>
                  {editingRuleId ? (
                    <button className="button-secondary" type="button" onClick={resetRuleForm}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </section>

          <section className="list-card span-8 admin-rules-card">
            <div className="section-title">
              <h2>Category rules</h2>
              <span className="pill">{rules.length} rules</span>
            </div>
            {loading ? (
              <div className="empty-state">Loading category rules...</div>
            ) : rules.length ? (
              <div className="data-list admin-scroll-list">
                {rules.map((rule) => (
                  <article className="item" key={rule._id}>
                    <div className="item-top">
                      <div>
                        <strong>{rule.keyword}</strong>
                        <div className="muted">
                          {rule.category} • confidence {Math.round(rule.confidence * 100)}% • priority {rule.priority}
                        </div>
                      </div>
                      <span className={`pill ${rule.active ? "pill-low" : ""}`}>{rule.active ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="inline-actions compact-actions">
                      <button className="button-secondary" type="button" onClick={() => beginRuleEdit(rule)}>
                        Edit
                      </button>
                      <button className="button-danger" type="button" onClick={() => deleteRule(rule._id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No category rules yet. Add one to expand categorization coverage.</div>
            )}
          </section>
        </div>
      </div>
    </RouteGuard>
  );
}
