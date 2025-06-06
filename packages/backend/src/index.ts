import express, { Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import { ValidRoutes } from "./shared/ValidRoutes.js";
import { connectMongo } from "./common/connectMongo.js";
import { ImageProvider } from "./common/ImageProvider.js";
import { CredentialsProvider } from "./common/CredentialsProvider.js";
import { createImageRouter } from "./routes/imageRoutes.js";
import { createAuthRouter } from "./routes/authRoutes.js";
import { verifyAuthToken } from "./middleware/verifyAuthToken.js";

dotenv.config(); // Read the .env file in the current working directory, and load values into process.env.
const PORT = process.env.PORT || 3000;
const STATIC_DIR = process.env.STATIC_DIR || "public";
// const STATIC_DIR = process.env.STATIC_DIR || "../frontend/dist";

const app = express();

// Set up JWT secret in app.locals
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET from environment variables");
}
app.locals.JWT_SECRET = JWT_SECRET;

// Enable JSON parsing middleware
app.use(express.json());

// Initialize MongoDB connection and providers
const mongoClient = connectMongo();
const imageProvider = new ImageProvider(mongoClient);
const credentialsProvider = new CredentialsProvider(mongoClient);

// Register auth routes (no authentication required)
const authRouter = createAuthRouter(credentialsProvider);
app.use("/auth", authRouter);

// Protect all API routes with authentication
app.use("/api/*", verifyAuthToken);

// Register image routes (protected by authentication)
const imageRouter = createImageRouter(imageProvider);
app.use("/api/images", imageRouter);

// Serve static files from the frontend dist directory
app.use(express.static(STATIC_DIR));

// Serve uploaded images
const IMAGE_UPLOAD_DIR = process.env.IMAGE_UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(IMAGE_UPLOAD_DIR));

app.get("/api/hello", (req: Request, res: Response) => {
    res.send("Hello, World");
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
