import { TransactionDocument } from "../../../models/Transaction";

export function detectCategoryBias(transactions: TransactionDocument[]) {
    if (transactions.length < 10) return null;

    const categoryMap: Record<string, { totalAmount: number; count: number}> = {};

    let totalSpend = 0;

    for (const tx of transactions) {
        totalSpend += tx.amount;

        if (!categoryMap[tx.category]) 
            categoryMap[tx.category] = { totalAmount: 0, count: 0};

        categoryMap[tx.category].totalAmount += tx.amount;
        categoryMap[tx.category].count += 1;

    }

    const totalTx = transactions.length;

    for (const [category, data] of Object.entries(categoryMap)) {
        if (data.count < 5) continue;

        const spendRatio = data.totalAmount / totalSpend;
        const txRatio = data.count / totalTx;

        if (spendRatio > 0.5 || txRatio > 0.45) {
            return {
                category,
                percentage: Math.round(Math.max(spendRatio, txRatio) * 100)
            };
        }
    }

    return null;
}