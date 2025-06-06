import express from "express";
import jwt from "jsonwebtoken";
import { CredentialsProvider } from "../common/CredentialsProvider.js";

interface IAuthTokenPayload {
    username: string;
}

function generateAuthToken(username: string, jwtSecret: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const payload: IAuthTokenPayload = {
            username
        };
        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: "1d" },
            (error, token) => {
                if (error) reject(error);
                else resolve(token as string);
            }
        );
    });
}

export function createAuthRouter(credentialsProvider: CredentialsProvider): express.Router {
    const router = express.Router();

    // POST /auth/register - Register a new user
    // @ts-ignore - TypeScript is being overly strict with Express route handlers
    router.post("/register", async (req, res) => {
        try {
            const { username, password } = req.body;

            // Validate request format
            if (!username || !password || typeof username !== "string" || typeof password !== "string") {
                return res.status(400).send({
                    error: "Bad request",
                    message: "Missing username or password"
                });
            }

            // Attempt to register user
            const success = await credentialsProvider.registerUser(username, password);
            
            if (!success) {
                return res.status(409).send({
                    error: "Conflict",
                    message: "Username already taken"
                });
            }

            // Success - Created
            res.status(201).send();
        } catch (error) {
            console.error("Error registering user:", error);
            res.status(500).json({ error: "Failed to register user" });
        }
    });

    // POST /auth/login - Login user
    // @ts-ignore - TypeScript is being overly strict with Express route handlers
    router.post("/login", async (req, res) => {
        try {
            const { username, password } = req.body;

            // Validate request format
            if (!username || !password || typeof username !== "string" || typeof password !== "string") {
                return res.status(400).send({
                    error: "Bad request",
                    message: "Missing username or password"
                });
            }

            // Verify password
            const isValidPassword = await credentialsProvider.verifyPassword(username, password);
            
            if (!isValidPassword) {
                return res.status(401).send({
                    error: "Unauthorized",
                    message: "Incorrect username or password"
                });
            }

            // Generate JWT token
            const jwtSecret = req.app.locals.JWT_SECRET as string;
            const token = await generateAuthToken(username, jwtSecret);

            // Return token
            res.json({ token });
        } catch (error) {
            console.error("Error logging in user:", error);
            res.status(500).json({ error: "Failed to login user" });
        }
    });

    return router;
} 