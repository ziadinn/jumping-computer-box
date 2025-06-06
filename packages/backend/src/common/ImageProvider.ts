import { MongoClient, Collection, ObjectId, OptionalId } from "mongodb";
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

    async getAllImages(searchTerm?: string): Promise<IApiImageData[]> {
        // Add random delay between 0 and 5 seconds for race condition testing
        await waitDuration(Math.random() * 5000);
        
        try {
            // Build query filter for searching by name
            const filter: any = {};
            if (searchTerm) {
                // Case-insensitive substring search
                filter.name = { $regex: searchTerm, $options: 'i' };
            }

            // Fetch images with optional search filter
            const images = await this.collection.find(filter).toArray();
            
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
                
                // If image has author field, try to find in userMap, otherwise create fake user
                let author: IApiUserData;
                if (image.author && userMap.has(image.author)) {
                    author = userMap.get(image.author)!;
                } else if (image.author) {
                    // Create fake user for authors not in users collection
                    author = {
                        id: image.author,
                        username: image.author
                    };
                } else {
                    author = defaultUser;
                }
                
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

    async updateImageName(imageId: string, newName: string): Promise<number> {
        try {
            // Convert string ID to ObjectId for the database query
            const objectId = new ObjectId(imageId);
            
            // Update the image name using updateOne
            const result = await this.collection.updateOne(
                { _id: objectId },
                { $set: { name: newName } }
            );
            
            // Return the number of documents modified
            return result.modifiedCount;
        } catch (error) {
            console.error("Error in updateImageName:", error);
            throw error;
        }
    }

    async getImageOwner(imageId: string): Promise<string | null> {
        try {
            // Convert string ID to ObjectId for the database query
            const objectId = new ObjectId(imageId);
            
            // Find the image by ID
            const image = await this.collection.findOne({ _id: objectId });
            
            if (!image) {
                return null; // Image doesn't exist
            }
            
            // If image has author field, return it; otherwise get default user
            if (image.author) {
                return image.author;
            }
            
            // Since images don't have author references in this database,
            // we'll return the first user's ID as default
            const users = await this.usersCollection.find().toArray();
            return users.length > 0 ? users[0]._id : "unknown";
        } catch (error) {
            console.error("Error in getImageOwner:", error);
            throw error;
        }
    }

    async createImage(src: string, name: string, author: string): Promise<void> {
        try {
            // @ts-ignore - TypeScript being overly strict with MongoDB insertOne
            await this.collection.insertOne({
                src: src,
                name: name,
                author: author
            });
        } catch (error) {
            console.error("Error in createImage:", error);
            throw error;
        }
    }
} 