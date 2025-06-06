import { useParams } from "react-router";
import type { IApiImageData } from "../../../backend/src/common/ApiImageData.ts";
import { ImageNameEditor } from "../ImageNameEditor";

interface IImageDetailsProps {
    images: IApiImageData[];
    isLoading: boolean;
    hasError: boolean;
    updateImageName: (imageId: string, newName: string) => Promise<void>;
}

export function ImageDetails({ images, isLoading, hasError, updateImageName }: IImageDetailsProps) {
    const { imageId } = useParams<{ imageId: string }>();

    if (isLoading) {
        return <p>Loading image details...</p>;
    }

    if (hasError) {
        return <p style={{ color: "red" }}>Error loading image details. Please try again later.</p>;
    }

    const image = images.find(image => image.id === imageId);
    if (!image) {
        return <h2>Image not found</h2>;
    }

    return (
        <>
            <h2>{image.name}</h2>
            <p>By {image.author.username}</p>
            <ImageNameEditor initialValue={image.name} imageId={image.id} updateImageName={updateImageName} />
            <img className="ImageDetails-img" src={image.src} alt={image.name} />
        </>
    )
}
