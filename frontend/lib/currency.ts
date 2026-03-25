export const SUPPORTED_CURRENCIES = ["USD", "INR", "AED", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function formatCurrency(amount: number, currency: SupportedCurrency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}
