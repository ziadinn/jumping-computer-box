import React, { useState, useActionState, useId } from "react";

interface IUploadPageProps {
    authToken: string;
}

interface IFormState {
    success?: boolean;
    error?: string;
}

function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.readAsDataURL(file);
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = (err) => reject(err);
    });
}

export function UploadPage(props: IUploadPageProps) {
    const { authToken } = props;
    const [previewSrc, setPreviewSrc] = useState<string>("");
    
    // IDs for accessibility
    const fileInputId = useId();
    const nameInputId = useId();

    const handleSubmit = async (_prevState: IFormState, formData: FormData): Promise<IFormState> => {
        try {
            // Check if we have both file and name
            const file = formData.get("image") as File;
            const name = formData.get("name") as string;

            if (!file || !file.name || !name) {
                return { error: "Please provide both an image file and a title." };
            }

            // Send the upload request
            const response = await fetch("/api/images", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authToken}`
                },
                body: formData // FormData automatically sets multipart/form-data
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = "Upload failed. Please try again.";
                
                if (response.status === 400) {
                    errorMessage = errorData.message || "Invalid file or missing information.";
                } else if (response.status === 401) {
                    errorMessage = "Authentication required. Please log in again.";
                } else if (response.status === 413) {
                    errorMessage = "File too large. Please choose a smaller image.";
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
                
                return { error: errorMessage };
            }

            // Success!
            return { success: true };
        } catch (error) {
            console.error("Upload failed:", error);
            return { error: "Network error. Please check your connection and try again." };
        }
    };

    const [state, submitAction, isPending] = useActionState(handleSubmit, {});

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const dataUrl = await readAsDataURL(file);
                setPreviewSrc(dataUrl);
            } catch (error) {
                console.error("Failed to read file:", error);
                setPreviewSrc("");
            }
        } else {
            setPreviewSrc("");
        }
    };

    return (
        <>
            <h2>Upload Image</h2>
            
            <form action={submitAction}>
                <div style={{ marginBottom: "1em" }}>
                    <label htmlFor={fileInputId}>Choose image to upload: </label>
                    <input
                        id={fileInputId}
                        name="image"
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        required
                        disabled={isPending}
                        onChange={handleFileChange}
                    />
                </div>
                
                <div style={{ marginBottom: "1em" }}>
                    <label htmlFor={nameInputId}>
                        <span>Image title: </span>
                        <input 
                            id={nameInputId}
                            name="name" 
                            required 
                            disabled={isPending}
                            style={{ marginLeft: "0.5em" }}
                        />
                    </label>
                </div>

                {previewSrc && (
                    <div style={{ marginBottom: "1em" }}>
                        <h3>Preview:</h3>
                        <img 
                            style={{ width: "20em", maxWidth: "100%" }} 
                            src={previewSrc} 
                            alt="Upload preview" 
                        />
                    </div>
                )}

                <div style={{ marginBottom: "1em" }}>
                    <input 
                        type="submit" 
                        value={isPending ? "Uploading..." : "Confirm upload"}
                        disabled={isPending}
                    />
                </div>

                {state.success && (
                    <div style={{ color: "green", marginTop: "0.5em" }} aria-live="polite">
                        ✓ Image uploaded successfully! You can now search for your image in the gallery.
                    </div>
                )}
                
                {state.error && (
                    <div style={{ color: "red", marginTop: "0.5em" }} aria-live="polite">
                        {state.error}
                    </div>
                )}
            </form>
        </>
    );
}
