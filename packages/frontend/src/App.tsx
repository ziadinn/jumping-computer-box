import { useState, useEffect, useRef } from "react";
import { Routes, Route } from "react-router";
import { AllImages } from "./images/AllImages.tsx";
import { ImageDetails } from "./images/ImageDetails.tsx";
import { UploadPage } from "./UploadPage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { MainLayout } from "./MainLayout.tsx";
import { ValidRoutes } from "../../backend/src/shared/ValidRoutes.ts";
import type { IApiImageData } from "../../backend/src/common/ApiImageData.ts";
import { ImageSearchForm } from "./images/ImageSearchForm.tsx";

function App() {
    const [imageData, setImageData] = useState<IApiImageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [searchString, setSearchString] = useState("");
    
    // Ref for race condition protection
    const requestNumberRef = useRef(0);

    const fetchImages = async (searchTerm?: string) => {
        // Increment request number and save to local variable
        requestNumberRef.current++;
        const thisRequestNumber = requestNumberRef.current;
        
        setIsLoading(true);
        
        try {
            const url = searchTerm 
                ? `/api/images?search=${encodeURIComponent(searchTerm)}`
                : "/api/images";
                
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const images = await response.json();
            
            // Only update state if this is still the most recent request
            if (thisRequestNumber === requestNumberRef.current) {
                setImageData(images);
                setHasError(false);
            }
        } catch (error) {
            console.error("Failed to fetch images:", error);
            // Only update state if this is still the most recent request
            if (thisRequestNumber === requestNumberRef.current) {
                setHasError(true);
            }
        } finally {
            // Only update state if this is still the most recent request
            if (thisRequestNumber === requestNumberRef.current) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        // Code in here will run when App is created
        // (Note in dev mode App is created twice)
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

    const handleImageSearch = () => {
        const searchTerm = searchString.trim();
        fetchImages(searchTerm || undefined);
    };

    const searchPanel = (
        <ImageSearchForm
            searchString={searchString}
            onSearchStringChange={setSearchString}
            onSearchRequested={handleImageSearch}
        />
    );

    return (
        <Routes>
            <Route path={ValidRoutes.HOME} element={<MainLayout />}>
                <Route index element={<AllImages images={imageData} isLoading={isLoading} hasError={hasError} searchPanel={searchPanel} />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="images/:imageId" element={<ImageDetails images={imageData} isLoading={isLoading} hasError={hasError} updateImageName={updateImageName} />} />
            </Route>
        </Routes>
    );
}

export default App;
