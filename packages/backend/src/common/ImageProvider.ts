import { MongoClient, Collection, ObjectId } from "mongodb";
import { IApiImageData, IApiUserData } from "./ApiImageData.js";

interface IImageDocument {
    _id: ObjectId;
    id?: string; // Optional - might not exist in database
    src: string;
    name: string;
    author?: string; // Optional - might not exist in database
}

interface IUserDocument {
    _id: string; // In this database, _id is a string, not ObjectId
    username: string;
    email?: string; // Optional field
}

function waitDuration(numMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, numMs));
}

export class ImageProvider {
    private collection: Collection<IImageDocument>;
    private usersCollection: Collection<IUserDocument>;

    constructor(private readonly mongoClient: MongoClient) {
        const collectionName = process.env.IMAGES_COLLECTION_NAME;
        const usersCollectionName = process.env.USERS_COLLECTION_NAME;
        
        if (!collectionName) {
            throw new Error("Missing IMAGES_COLLECTION_NAME from environment variables");
        }
        if (!usersCollectionName) {
            throw new Error("Missing USERS_COLLECTION_NAME from environment variables");
        }
        
        this.collection = this.mongoClient.db().collection(collectionName);
        this.usersCollection = this.mongoClient.db().collection(usersCollectionName);
    }

    async getAllImages(): Promise<IApiImageData[]> {
        // Add 1-second delay as requested
        await waitDuration(1000);
        
        try {
            // Fetch all images
            const images = await this.collection.find().toArray();
            
            // Fetch all users 
            const users = await this.usersCollection.find().toArray();
            
            // Create a map for quick user lookup using _id as the key
            const userMap = new Map<string, IApiUserData>();
            users.forEach(user => {
                userMap.set(user._id, {
                    id: user._id, // Use _id as the id
                    username: user.username
                });
            });
            
            // Since images don't have author references in this database,
            // we'll assign a default user or create a mapping
            // For now, let's assign the first user to all images
            const defaultUser = users.length > 0 ? {
                id: users[0]._id,
                username: users[0].username
            } : {
                id: "unknown",
                username: "unknown"
            };
            
            // Denormalize the data by creating proper image objects
            const denormalizedImages: IApiImageData[] = images.map(image => {
                // Use id field if available, otherwise use _id.toString()
                const imageId = image.id || image._id.toString();
                
                // If image has author field, use it; otherwise use default user
                const author = image.author && userMap.has(image.author) 
                    ? userMap.get(image.author)! 
                    : defaultUser;
                
                return {
                    id: imageId,
                    src: image.src,
                    name: image.name,
                    author: author
                };
            });
            
            return denormalizedImages;
        } catch (error) {
            console.error("Error in getAllImages:", error);
            throw error;
        }
    }
} 