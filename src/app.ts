import express from "express";
import cors from "cors";
import transactionRoutes from "./routes/transactions.routes";
import insightRoutes from "./routes/insights.routes";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/admin", adminRoutes);

export default app;