export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserSession = {
  userId: string;
  role: string;
  currency?: string;
  exp?: number;
  iat?: number;
};

export type Transaction = {
  _id: string;
  amount: number;
  category: string;
  categoryConfidence: number;
  categorizationReason: string;
  merchant: string;
  description: string;
  transactionDate: string;
  timeBucket: string;
  isRecurring: boolean;
  createdAt: string;
};

export type Budget = {
  _id: string;
  category: Transaction["category"];
  limitAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type TransactionFilters = {
  category?: string;
  timeBucket?: string;
  merchant?: string;
  startDate?: string;
  endDate?: string;
};

export type BiasInsight = {
  _id?: string;
  userId: string;
  biasType: "CATEGORY" | "TIME" | "MERCHANT";
  value: string;
  percentage: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  period: string;
  generatedFrom?: string;
  createdAt?: string;
};

export type AdminUser = {
  _id: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

export type CategoryRule = {
  _id: string;
  keyword: string;
  category: "FOOD" | "TRANSPORT" | "ENTERTAINMENT" | "UTILITIES" | "OTHER";
  confidence: number;
  priority: number;
  active: boolean;
  createdAt: string;
};

export type TransactionSummary = {
  totalSpend: number;
  transactionCount: number;
  categoryBreakdown: Array<{
    category: string;
    totalAmount: number;
    count: number;
  }>;
  timeBucketBreakdown: Array<{
    timeBucket: string;
    totalAmount: number;
    count: number;
  }>;
  topMerchants: Array<{
    merchant: string;
    totalAmount: number;
    count: number;
  }>;
  recurringMerchants: Array<{
    merchant: string;
    amount: number;
    occurrences: number;
  }>;
  duplicateCandidates: Array<{
    merchant: string;
    amount: number;
    transactionDate: string;
    occurrences: number;
    transactionIds: string[];
  }>;
  budgetProgress: Array<{
    category: string;
    limitAmount: number;
    spentAmount: number;
    remainingAmount: number;
    usageRatio: number;
    status: "HEALTHY" | "WARNING" | "EXCEEDED";
  }>;
  dailyTrend: Array<{
    date: string;
    totalAmount: number;
  }>;
  timezone?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  accessToken?: string | null;
};

function parseJwt(token: string): UserSession | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(normalized);
    return JSON.parse(decoded) as UserSession;
  } catch {
    return null;
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload as T;
}

function normalizeTokens(payload: { token?: AuthTokens; accessToken?: string; refreshToken?: string }): AuthTokens {
  if (payload.token?.accessToken && payload.token?.refreshToken) {
    return payload.token;
  }

  if (payload.accessToken && payload.refreshToken) {
    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken
    };
  }

  throw new Error("Unexpected auth response shape");
}

export const api = {
  parseJwt,
  get baseUrl() {
    return API_BASE_URL;
  },
  buildTransactionQuery(filters: TransactionFilters = {}) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        params.set(key, value);
      }
    }

    const query = params.toString();
    return query ? `?${query}` : "";
  },
  async register(input: { email: string; password: string }) {
    const payload = await apiRequest<{ token?: AuthTokens; accessToken?: string; refreshToken?: string }>(
      "/api/auth/register",
      { method: "POST", body: input }
    );
    return normalizeTokens(payload);
  },
  async login(input: { email: string; password: string }) {
    const payload = await apiRequest<{ token?: AuthTokens; accessToken?: string; refreshToken?: string }>(
      "/api/auth/login",
      { method: "POST", body: input }
    );
    return normalizeTokens(payload);
  },
  async refresh(refreshToken: string) {
    return apiRequest<{ accessToken: string }>("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken }
    });
  },
  async logout(refreshToken: string) {
    return apiRequest<{ message: string }>("/api/auth/logout", {
      method: "POST",
      body: { refreshToken }
    });
  },
  async updateCurrency(accessToken: string, currency: string) {
    return apiRequest<{ accessToken: string; currency: string }>("/api/auth/currency", {
      method: "PATCH",
      accessToken,
      body: { currency }
    });
  },
  async getTransactions(accessToken: string, filters: TransactionFilters = {}) {
    return apiRequest<{ count: number; transactions: Transaction[] }>(
      `/api/transactions${api.buildTransactionQuery(filters)}`,
      {
        accessToken
      }
    );
  },
  async getTransactionSummary(accessToken: string) {
    const timezone =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    const query = timezone ? `?timezone=${encodeURIComponent(timezone)}` : "";

    return apiRequest<TransactionSummary>(`/api/transactions/summary${query}`, {
      accessToken
    });
  },
  async getBudgets(accessToken: string) {
    return apiRequest<{ budgets: Budget[] }>("/api/transactions/budgets", {
      accessToken
    });
  },
  async upsertBudget(accessToken: string, category: Transaction["category"], limitAmount: number) {
    return apiRequest<{ message: string; budget: Budget }>(`/api/transactions/budgets/${category}`, {
      method: "PUT",
      accessToken,
      body: { limitAmount }
    });
  },
  async exportTransactionsCsv(accessToken: string, filters: TransactionFilters = {}) {
    const response = await fetch(`${API_BASE_URL}/api/transactions/export${api.buildTransactionQuery(filters)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message ?? "Could not export transactions");
    }

    return response.text();
  },
  async createTransaction(
    accessToken: string,
    input: { amount: number; merchant: string; description: string; transactionDate: string }
  ) {
    return apiRequest<{ message: string; transaction: Transaction }>("/api/transactions", {
      method: "POST",
      accessToken,
      body: input
    });
  },
  async updateTransaction(
    accessToken: string,
    transactionId: string,
    input: {
      amount?: number;
      merchant?: string;
      description?: string;
      transactionDate?: string;
      category?: Transaction["category"];
      saveAsRule?: boolean;
      ruleKeyword?: string;
    }
  ) {
    return apiRequest<{ message: string; transaction: Transaction }>(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      accessToken,
      body: input
    });
  },
  async deleteTransaction(accessToken: string, transactionId: string) {
    return apiRequest<{ message: string }>(`/api/transactions/${transactionId}`, {
      method: "DELETE",
      accessToken
    });
  },
  async getInsights(accessToken: string) {
    return apiRequest<{ insights: BiasInsight[] }>("/api/insights", {
      accessToken
    });
  },
  async generateInsights(accessToken: string) {
    return apiRequest<{ message: string; insights: BiasInsight[] }>("/api/insights/generate", {
      method: "POST",
      accessToken
    });
  },
  async getUsers(
    accessToken: string,
    filters: { search?: string; role?: string; sort?: "newest" | "oldest" } = {}
  ) {
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.role) params.set("role", filters.role);
    if (filters.sort) params.set("sort", filters.sort);

    const query = params.toString();

    return apiRequest<{ users: AdminUser[] }>(`/api/admin/users${query ? `?${query}` : ""}`, {
      accessToken
    });
  },
  async updateUserRole(accessToken: string, userId: string, role: "USER" | "ADMIN") {
    return apiRequest<{ message: string; user: AdminUser }>(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      accessToken,
      body: { role }
    });
  },
  async getCategoryRules(accessToken: string) {
    return apiRequest<{ rules: CategoryRule[] }>("/api/admin/category-rules", {
      accessToken
    });
  },
  async createCategoryRule(
    accessToken: string,
    input: { keyword: string; category: CategoryRule["category"]; confidence: number; priority: number; active: boolean }
  ) {
    return apiRequest<{ message: string; rule: CategoryRule }>("/api/admin/category-rules", {
      method: "POST",
      accessToken,
      body: input
    });
  },
  async updateCategoryRule(
    accessToken: string,
    ruleId: string,
    input: Partial<{
      keyword: string;
      category: CategoryRule["category"];
      confidence: number;
      priority: number;
      active: boolean;
    }>
  ) {
    return apiRequest<{ message: string; rule: CategoryRule }>(`/api/admin/category-rules/${ruleId}`, {
      method: "PATCH",
      accessToken,
      body: input
    });
  },
  async deleteCategoryRule(accessToken: string, ruleId: string) {
    return apiRequest<{ message: string }>(`/api/admin/category-rules/${ruleId}`, {
      method: "DELETE",
      accessToken
    });
  }
};
