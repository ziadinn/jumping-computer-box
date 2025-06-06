import React, { useActionState } from "react";
import { Link, useNavigate } from "react-router";
import "./LoginPage.css";

interface ILoginPageProps {
    isRegistering?: boolean;
    onAuthToken: (token: string) => void;
}

interface IFormState {
    error?: string;
}

export function LoginPage(props: ILoginPageProps) {
    const { isRegistering = false, onAuthToken } = props;
    const usernameInputId = React.useId();
    const passwordInputId = React.useId();
    const navigate = useNavigate();

    const handleSubmit = async (_prevState: IFormState, formData: FormData): Promise<IFormState> => {
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;

        try {
            const endpoint = isRegistering ? "/auth/register" : "/auth/login";
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = "An error occurred. Please try again.";
                
                if (response.status === 400) {
                    errorMessage = "Please provide both username and password.";
                } else if (response.status === 401) {
                    errorMessage = "Incorrect username or password.";
                } else if (response.status === 409) {
                    errorMessage = "Username already exists. Please choose a different username.";
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
                
                return { error: errorMessage };
            }

            if (isRegistering) {
                // For registration, the response now includes a token
                const data = await response.json();
                if (data.token) {
                    onAuthToken(data.token);
                    navigate("/");
                } else {
                    console.log("Successfully created account");
                    // If no token, redirect to login
                    navigate("/login");
                }
            } else {
                // For login, extract the token
                const data = await response.json();
                onAuthToken(data.token);
                navigate("/");
            }

            return {}; // Success - no error
        } catch (error) {
            console.error("Request failed:", error);
            return { error: "Network error. Please check your connection and try again." };
        }
    };

    const [state, submitAction, isPending] = useActionState(handleSubmit, {});

    return (
        <>
            <h2>{isRegistering ? "Register a new account" : "Login"}</h2>
            <form className="LoginPage-form" action={submitAction}>
                <label htmlFor={usernameInputId}>Username</label>
                <input 
                    id={usernameInputId}
                    name="username"
                    required
                    disabled={isPending}
                />

                <label htmlFor={passwordInputId}>Password</label>
                <input 
                    id={passwordInputId} 
                    name="password"
                    type="password"
                    required
                    disabled={isPending}
                />

                <input 
                    type="submit" 
                    value={isPending ? "Please wait..." : "Submit"}
                    disabled={isPending}
                />
                
                {state.error && (
                    <div style={{ color: "red", marginTop: "0.5em" }} aria-live="polite">
                        {state.error}
                    </div>
                )}
            </form>
            
            {!isRegistering && (
                <p style={{ marginTop: "1em" }}>
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
            )}
        </>
    );
}
