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
            // Send PUT request to update the image name
            const response = await fetch(`/api/images/${props.imageId}/name`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: input })
            });

            if (!response.ok) {
                // Parse error response
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                } catch (parseError) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            // Success! Update the local state
            props.updateImageName(props.imageId, input);
            setIsEditingName(false);
            setError(null);
        } catch (error) {
            console.error("Failed to update image name:", error);
            setError(error instanceof Error ? error.message : "Failed to update image name. Please try again.");
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