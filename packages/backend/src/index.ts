import express, { Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import { ValidRoutes } from "./shared/ValidRoutes.js";
import { getImagesWithDelay } from "./common/ApiImageData.js";

dotenv.config(); // Read the .env file in the current working directory, and load values into process.env.
const PORT = process.env.PORT || 3000;
const STATIC_DIR = process.env.STATIC_DIR || "public";
// const STATIC_DIR = process.env.STATIC_DIR || "../frontend/dist";

const app = express();

// Serve static files from the frontend dist directory
app.use(express.static(STATIC_DIR));

app.get("/api/hello", (req: Request, res: Response) => {
    res.send("Hello, World");
});

app.get("/api/images", async (req: Request, res: Response) => {
    try {
        const images = await getImagesWithDelay();
        res.json(images);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch images" });
    }
});

// Serve the React app for all valid routes
Object.values(ValidRoutes).forEach(route => {
    app.get(route, (req: Request, res: Response) => {
        res.sendFile(path.resolve(STATIC_DIR, "index.html"));
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
