import { useState, useEffect } from "react";
import { Routes, Route } from "react-router";
import { AllImages } from "./images/AllImages.tsx";
import { ImageDetails } from "./images/ImageDetails.tsx";
import { UploadPage } from "./UploadPage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { MainLayout } from "./MainLayout.tsx";
import { ValidRoutes } from "../../backend/src/shared/ValidRoutes.ts";
import type { IApiImageData } from "../../backend/src/common/ApiImageData.ts";

function App() {
    const [imageData, setImageData] = useState<IApiImageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Code in here will run when App is created
        // (Note in dev mode App is created twice)
        const fetchImages = async () => {
            try {
                const response = await fetch("/api/images");
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const images = await response.json();
                setImageData(images);
                setHasError(false);
            } catch (error) {
                console.error("Failed to fetch images:", error);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchImages();
    }, []);

    const updateImageName = (imageId: string, newName: string) => {
        setImageData(prevImages => 
            prevImages.map(image => 
                image.id === imageId 
                    ? { ...image, name: newName }
                    : image
            )
        );
    };

    return (
        <Routes>
            <Route path={ValidRoutes.HOME} element={<MainLayout />}>
                <Route index element={<AllImages images={imageData} isLoading={isLoading} hasError={hasError} />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="images/:imageId" element={<ImageDetails images={imageData} isLoading={isLoading} hasError={hasError} updateImageName={updateImageName} />} />
            </Route>
        </Routes>
    );
}

export default App;
