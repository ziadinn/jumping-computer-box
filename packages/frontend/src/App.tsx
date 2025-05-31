import { useState } from "react";
import { Routes, Route } from "react-router";
import { AllImages } from "./images/AllImages.tsx";
import { ImageDetails } from "./images/ImageDetails.tsx";
import { UploadPage } from "./UploadPage.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { MainLayout } from "./MainLayout.tsx";
import { fetchDataFromServer, type IImageData } from "./MockAppData.ts";
import { ValidRoutes } from "../../backend/src/shared/ValidRoutes.ts";

function App() {
    const [imageData] = useState<IImageData[]>(fetchDataFromServer);

    return (
        <Routes>
            <Route path={ValidRoutes.HOME} element={<MainLayout />}>
                <Route index element={<AllImages images={imageData} />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="images/:imageId" element={<ImageDetails images={imageData} />} />
            </Route>
        </Routes>
    );
}

export default App;
