import { TransactionDocument } from "../../../models/Transaction";

export function detectTimeBias(transactions: TransactionDocument[]) {
  if (transactions.length < 15) return null;

  const buckets = {
    MORNING: [] as number[],
    AFTERNOON: [] as number[],
    NIGHT: [] as number[]
  };

  for (const tx of transactions) {
    buckets[tx.timeBucket].push(tx.amount);
  }

  const totalSpend = transactions.reduce((s, t) => s + t.amount, 0);
  const totalTx = transactions.length;

  for (const [bucket, amounts] of Object.entries(buckets)) {
    if (amounts.length < 5) continue;

    const bucketSpend = amounts.reduce((a, b) => a + b, 0);
    const spendRatio = bucketSpend / totalSpend;
    const txRatio = amounts.length / totalTx;

    if (spendRatio > 0.6 || txRatio > 0.5) {
      return {
        bucket,
        percentage: Math.round(Math.max(spendRatio, txRatio) * 100)
      };
    }
  }

  return null;
}