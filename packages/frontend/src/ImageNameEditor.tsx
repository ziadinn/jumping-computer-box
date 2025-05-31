import { useState } from "react";

interface INameEditorProps {
    initialValue: string;
    imageId: string;
    updateImageName: (imageId: string, newName: string) => void;
}

export function ImageNameEditor(props: INameEditorProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [input, setInput] = useState(props.initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmitPressed() {
        if (input.length === 0) return;
        
        setIsSubmitting(true);
        setError(null);

        try {
            // Fetch from the same URL as used in App.tsx (simulating the real API we'll implement later)
            const response = await fetch("/api/images");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Ignore the response data as requested, just update the local state
            props.updateImageName(props.imageId, input);
            setIsEditingName(false);
            setError(null);
        } catch (error) {
            console.error("Failed to update image name:", error);
            setError("Failed to update image name. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isEditingName) {
        return (
            <div style={{ margin: "1em 0" }}>
                <label>
                    New Name <input 
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        disabled={isSubmitting}
                    />
                </label>
                <button 
                    disabled={input.length === 0 || isSubmitting} 
                    onClick={handleSubmitPressed}
                >
                    Submit
                </button>
                <button 
                    onClick={() => setIsEditingName(false)}
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                {isSubmitting && <p>Working...</p>}
                {error && <p style={{ color: "red" }}>{error}</p>}
            </div>
        );
    } else {
        return (
            <div style={{ margin: "1em 0" }}>
                <button onClick={() => setIsEditingName(true)}>Edit name</button>
            </div>
        );
    }
} 