import { Collection, MongoClient } from "mongodb";
import bcrypt from "bcrypt";

interface ICredentialsDocument {
    _id: string; // username as _id
    username: string;
    password: string; // salt + hash from bcrypt
}

export class CredentialsProvider {
    private readonly collection: Collection<ICredentialsDocument>;

    constructor(mongoClient: MongoClient) {
        const COLLECTION_NAME = process.env.CREDS_COLLECTION_NAME;
        if (!COLLECTION_NAME) {
            throw new Error("Missing CREDS_COLLECTION_NAME from env file");
        }
        this.collection = mongoClient.db().collection<ICredentialsDocument>(COLLECTION_NAME);
    }

    async registerUser(username: string, plaintextPassword: string): Promise<boolean> {
        try {
            // Check if username already exists
            const existingUser = await this.collection.findOne({ _id: username });
            if (existingUser) {
                return false; // User already exists
            }

            // Generate salt and hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(plaintextPassword, salt);

            // Insert new user record
            await this.collection.insertOne({
                _id: username,
                username: username,
                password: hashedPassword // bcrypt already includes salt
            });

            return true; // Success
        } catch (error) {
            console.error("Error in registerUser:", error);
            throw error;
        }
    }

    async verifyPassword(username: string, plaintextPassword: string): Promise<boolean> {
        try {
            // Find user by username
            const user = await this.collection.findOne({ _id: username });
            if (!user) {
                return false; // User doesn't exist
            }

            // Compare password with stored hash
            const isMatch = await bcrypt.compare(plaintextPassword, user.password);
            return isMatch;
        } catch (error) {
            console.error("Error in verifyPassword:", error);
            throw error;
        }
    }
} 