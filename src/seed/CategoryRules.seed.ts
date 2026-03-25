import dotenv from "dotenv";
import { CategoryRule } from "../models/CategoryRule";
import { connectDB } from "../config/database";

dotenv.config();

async function seedCategoryRules () {
    await connectDB();

    await CategoryRule.deleteMany({}); // dev only

    await CategoryRule.insertMany([
        {
            keyword: "zomato",
            category: "FOOD",
            confidence: 0.9,
            priority: 10
        },
        {
            keyword: "swiggy",
            category: "FOOD",
            confidence: 0.9,
            priority: 10
        },
        {
            keyword: "uber",
            category: "TRANSPORT",
            confidence: 0.85,
            priority: 9
        },
        {
            keyword: "ola",
            category: "TRANSPORT",
            confidence: 0.85,
            priority: 9
        },
        {
            keyword: "netflix",
            category: "ENTERTAINMENT",
            confidence: 0.95,
            priority: 8
        },
        {
            keyword: "electricity",
            category: "UTILITIES",
            confidence: 0.8,
            priority: 7
        }
    ]);

    console.log("Category rules seeded");
    process.exit(0);
}

seedCategoryRules();