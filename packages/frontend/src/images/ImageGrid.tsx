import { Link } from "react-router";
import type { IImageData } from "../MockAppData.ts";
import { ValidRoutes } from "../../../backend/src/shared/ValidRoutes.ts";
import "./Images.css";

interface IImageGridProps {
    images: IImageData[];
}

export function ImageGrid(props: IImageGridProps) {
    const imageElements = props.images.map((image) => (
        <div key={image.id} className="ImageGrid-photo-container">
            <Link to={ValidRoutes.IMAGE_DETAILS.replace(":imageId", image.id)}>
                <img src={image.src} alt={image.name}/>
            </Link>
        </div>
    ));
    return (
        <div className="ImageGrid">
            {imageElements}
        </div>
    );
}
