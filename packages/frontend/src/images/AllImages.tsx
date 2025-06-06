import type { IApiImageData } from "../../../backend/src/common/ApiImageData.ts";
import { ImageGrid } from "./ImageGrid.tsx";

interface IAllImagesProps {
    images: IApiImageData[];
    isLoading: boolean;
    hasError: boolean;
    searchPanel: React.ReactNode;
}

export function AllImages({ images, isLoading, hasError, searchPanel }: IAllImagesProps) {
    if (isLoading) {
        return (
            <>
                <h2>All Images</h2>
                {searchPanel}
                <p>Loading images...</p>
            </>
        );
    }

    if (hasError) {
        return (
            <>
                <h2>All Images</h2>
                {searchPanel}
                <p style={{ color: "red" }}>Error loading images. Please try again later.</p>
            </>
        );
    }

    return (
        <>
            <h2>All Images</h2>
            {searchPanel}
            <ImageGrid images={images} />
        </>
    );
}
