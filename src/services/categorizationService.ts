import { CategoryRule } from "../models/CategoryRule";

interface CategorizationResult {
    category: string,
    confidence: number,
    reason: string
};

export async function categorizeTransaction( text: string ): Promise<CategorizationResult> {
    const normalizedText = text.toLowerCase();

    const rules = await CategoryRule.find({ active: true }).sort({ priority: -1, confidence: -1});

    for(const rule of rules) {
        if(normalizedText.includes(rule.keyword)) {
            return {
                category: rule.category,
                confidence: rule.confidence,
                reason: `Matched keyword '${rule.keyword}'`
            };
        }
    }

    return {
        category: "Uncategorized",
        confidence: 0,
        reason: "No matching rule"
    }
}