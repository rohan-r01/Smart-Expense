import { TransactionDocument } from "../../../models/Transaction";

export function detectMerchantBias(transactions: TransactionDocument[]) {
    if (transactions.length < 10) return null;

    const merchantMap: Record<string, { totalAmount: number; count: number}> = {};

    let totalSpend = 0;

    for (const tx of transactions) {
        totalSpend += tx.amount;

        const merchant = tx.merchant.toLowerCase();

        if (!merchantMap[merchant])
            merchantMap[merchant] = { totalAmount: 0, count: 0 };

        merchantMap[merchant].totalAmount += tx.amount;
        merchantMap[merchant].count += 1;
    }

    const totalTx = transactions.length;

    for (const [merchant, data] of Object.entries(merchantMap)) {
        if (data.count < 5) continue;

        const spendRatio = data.totalAmount / totalSpend;
        const txRatio = data.count / totalTx;

        if (spendRatio > 0.4 || txRatio > 0.35) {
            return {
                merchant,
                percentage: Math.round(Math.max(spendRatio, txRatio) * 100)
            };
        }
    }

    return null;
}