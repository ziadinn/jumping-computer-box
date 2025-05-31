import express from "express";
import { ObjectId } from "mongodb";
import { ImageProvider } from "../common/ImageProvider.js";

export function createImageRouter(imageProvider: ImageProvider): express.Router {
    const router = express.Router();

    // GET /api/images - Get all images or search by name
    // @ts-ignore - TypeScript is being overly strict with Express route handlers
    router.get("/", async (req, res) => {
        try {
            // Read search query parameter
            const searchQuery = req.query.search;
            let searchTerm: string | undefined;
            
            if (typeof searchQuery === "string") {
                searchTerm = searchQuery;
                console.log("Search query:", searchTerm);
            } else if (searchQuery !== undefined) {
                // Parameter exists but is not a simple string
                return res.status(400).send({
                    error: "Bad Request",
                    message: "Search parameter must be a string"
                });
            }

            const images = await imageProvider.getAllImages(searchTerm);
            res.json(images);
        } catch (error) {
            console.error("Error fetching images:", error);
            res.status(500).json({ error: "Failed to fetch images" });
        }
    });

    // PUT /:id/name - Update image name
    // @ts-ignore - TypeScript is being overly strict with Express route handlers
    router.put("/:id/name", async (req, res) => {
        try {
            const imageId = req.params.id;
            const { name } = req.body;

            // Validate request format
            if (!name || typeof name !== "string") {
                return res.status(400).send({
                    error: "Bad Request",
                    message: "Request body must contain a 'name' field with a string value"
                });
            }

            // Check name length limit
            const MAX_NAME_LENGTH = 100;
            if (name.length > MAX_NAME_LENGTH) {
                return res.status(422).send({
                    error: "Unprocessable Entity",
                    message: `Image name exceeds ${MAX_NAME_LENGTH} characters`
                });
            }

            // Validate ObjectId
            if (!ObjectId.isValid(imageId)) {
                return res.status(404).send({
                    error: "Not Found",
                    message: "Image does not exist"
                });
            }

            // Update the image name
            const updateCount = await imageProvider.updateImageName(imageId, name);
            
            if (updateCount === 0) {
                return res.status(404).send({
                    error: "Not Found",
                    message: "Image does not exist"
                });
            }

            // Success - No Content
            res.status(204).send();
        } catch (error) {
            console.error("Error updating image name:", error);
            res.status(500).json({ error: "Failed to update image name" });
        }
    });

    return router;
} 