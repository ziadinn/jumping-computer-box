import { useState, useEffect, useRef } from "react";
import { Routes, Route } from "react-router";
import { AllImages } from "./images/AllImages.tsx";
import { ImageDetails } from "./images/ImageDetails.tsx";
import { UploadPage } from "./UploadPage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { MainLayout } from "./MainLayout.tsx";
import { ProtectedRoute } from "./ProtectedRoute.tsx";
import { ValidRoutes } from "../../backend/src/shared/ValidRoutes.ts";
import type { IApiImageData } from "../../backend/src/common/ApiImageData.ts";
import { ImageSearchForm } from "./images/ImageSearchForm.tsx";

function App() {
    const [imageData, setImageData] = useState<IApiImageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [searchString, setSearchString] = useState("");
    const [authToken, setAuthToken] = useState("");
    
    // Ref for race condition protection
    const requestNumberRef = useRef(0);

    const fetchImages = async (searchTerm?: string) => {
        // Don't fetch if we don't have an auth token
        if (!authToken) {
            setIsLoading(false);
            return;
        }

        // Increment request number and save to local variable
        requestNumberRef.current++;
        const thisRequestNumber = requestNumberRef.current;
        
        setIsLoading(true);
        
        try {
            const url = searchTerm 
                ? `/api/images?search=${encodeURIComponent(searchTerm)}`
                : "/api/images";
                
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${authToken}`
                }
            });
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

    // Fetch images whenever auth token changes
    useEffect(() => {
        fetchImages();
    }, [authToken]);

    const updateImageName = async (imageId: string, newName: string) => {
        try {
            const response = await fetch(`/api/images/${imageId}/name`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify({ name: newName })
            });

            if (response.ok) {
                // Update local state
                setImageData(prevImages => 
                    prevImages.map(image => 
                        image.id === imageId 
                            ? { ...image, name: newName }
                            : image
                    )
                );
            } else {
                console.error("Failed to update image name:", response.status);
            }
        } catch (error) {
            console.error("Error updating image name:", error);
        }
    };

    const handleImageSearch = () => {
        const searchTerm = searchString.trim();
        fetchImages(searchTerm || undefined);
    };

    const handleAuthToken = (token: string) => {
        setAuthToken(token);
        // Reset search when user logs in
        setSearchString("");
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
                <Route 
                    index 
                    element={
                        <ProtectedRoute authToken={authToken}>
                            <AllImages images={imageData} isLoading={isLoading} hasError={hasError} searchPanel={searchPanel} />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="upload" 
                    element={
                        <ProtectedRoute authToken={authToken}>
                            <UploadPage />
                        </ProtectedRoute>
                    } 
                />
                <Route path="login" element={<LoginPage onAuthToken={handleAuthToken} />} />
                <Route path="register" element={<LoginPage isRegistering={true} onAuthToken={handleAuthToken} />} />
                <Route 
                    path="images/:imageId" 
                    element={
                        <ProtectedRoute authToken={authToken}>
                            <ImageDetails images={imageData} isLoading={isLoading} hasError={hasError} updateImageName={updateImageName} />
                        </ProtectedRoute>
                    } 
                />
            </Route>
        </Routes>
    );
}

export default App;
