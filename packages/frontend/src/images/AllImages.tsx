import type { IImageData } from "../MockAppData.ts";
import { ImageGrid } from "./ImageGrid.tsx";

interface IAllImagesProps {
    images: IImageData[];
}

export function AllImages({ images }: IAllImagesProps) {
    return (
        <>
            <h2>All Images</h2>
            <ImageGrid images={images} />
        </>
    );
}
