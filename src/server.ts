import dotenv from "dotenv";
import app from "./app";
import { connectDB } from "./config/database";

dotenv.config();

const PORT = process.env.PORT || 4000;

const startServer = async () => {

    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start the server");
        process.exit(1);

    }
};

startServer();