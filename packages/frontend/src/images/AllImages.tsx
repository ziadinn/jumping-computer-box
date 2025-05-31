import type { IApiImageData } from "../../../backend/src/common/ApiImageData.ts";
import { ImageGrid } from "./ImageGrid.tsx";

interface IAllImagesProps {
    images: IApiImageData[];
    isLoading: boolean;
    hasError: boolean;
}

export function AllImages({ images, isLoading, hasError }: IAllImagesProps) {
    if (isLoading) {
        return (
            <>
                <h2>All Images</h2>
                <p>Loading images...</p>
            </>
        );
    }

    if (hasError) {
        return (
            <>
                <h2>All Images</h2>
                <p style={{ color: "red" }}>Error loading images. Please try again later.</p>
            </>
        );
    }

    return (
        <>
            <h2>All Images</h2>
            <ImageGrid images={images} />
        </>
    );
}
