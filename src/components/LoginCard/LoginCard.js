import React, { useState } from "react"; 
import './LoginCard.css';
import DetailsPage from "../DetailsPage/DetailsPage";
import { Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';

function LoginCard({ flowType = 'user', onLoginSuccess }) { 
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [username,setUsername] = useState('');
    const [userNameExists,setuserNameExists] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [nextStep, setNextStep] = useState('initial');
    const [emailExists, setemailExists] = useState(false);
    const backendBaseUrl = 'http://localhost:8080'; 
    const navigate = useNavigate();

    const handleContinue = async (event) => {
        if (event) event.preventDefault();
        setIsLoading(true);
        setError(null);
        const backendUrl = '/api/auth/check-identifier';
        console.log('Continue with:', identifier);
        if (flowType === 'user') {

             setNextStep('register'); 
        } else { 
            setNextStep('register');
        }

        setIsLoading(false); // Stop loading after check/decision
    

        try {
            console.log(`Sending identifier (email) to backend: ${identifier}`);
            const response = await fetch(`${backendBaseUrl}${backendUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier: identifier}),
            });

            const responseData = await response.json();
            console.log("Check Identifier Response:", responseData);
            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
            }

            console.log('Backend response:', responseData);

            if (responseData.emailExists === true) { 
                setemailExists(true);
                setNextStep('login');
            } else if (responseData.emailExists === false) { 
                setemailExists(false);
                setNextStep('register');
            } else {
                console.error("Unexpected response format from check-identifier:", responseData);
                throw new Error("Received unexpected data from server.");
            }

        } catch (err) {
            console.error('Failed to check identifier:', err);
            setError(err.message || 'Could not connect to server. Please try again.');
            setNextStep('initial'); // Stay on initial step on error

        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        let url;
        let payload;
        let actionVerb;

        if (nextStep === 'login') {
            url = `${backendBaseUrl}/api/auth/login`;
            payload = { identifier, password };
            actionVerb = "Login";
        } else { // register step
            payload = { identifier, username, password };
            url = (flowType === 'cook')
                ? `${backendBaseUrl}/api/auth/register/cook` // Cook registration endpoint
                : `${backendBaseUrl}/api/auth/register/user`; // User registration endpoint
            actionVerb = (flowType === 'cook') ? "Cook Registration" : "User Registration";
        }

        console.log(`Submitting ${actionVerb} to ${url} with payload:`, payload);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json(); // Attempt to parse JSON

            if (!response.ok) {
                throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
            }

            // --- Success ---
            console.log(`${actionVerb} Successful:`, responseData);

            if (typeof onLoginSuccess === 'function') {
                onLoginSuccess(responseData);
            } else {
                console.error("onLoginSuccess callback is missing!");

        } 
    }catch (err) {
            console.error(`${actionVerb} failed:`, err);
            setError(err.message || `An unexpected error occurred during ${actionVerb}.`);
        } finally {

            setIsLoading(false);
        }
    };
    const handleGoBack = () => {
        setIdentifier('');
        setPassword('');
        setUsername('');
        setError(null);
        setIsLoading(false);
        setemailExists(false);
        setNextStep('initial');
    };
    return (
        <div className="login-card">
            {error && <p className="error-message">{error}</p>}
            {nextStep === 'initial' && (
                <>
                    <h2 className="card-title">What's your email?</h2>
                    <form onSubmit={handleContinue} className="login-form">
                        <div className="form-group">
                            <input
                                type="email"
                                id="identifier"
                                className="form-input"
                                placeholder="Enter your email "
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                aria-label="Email"
                                disabled={isLoading}
                            />
                        </div>
                        <button type="submit" className="submit-button primary-button" disabled={isLoading}>
                            {isLoading ? 'Checking...' : 'Continue'}
                        </button>
                    </form>
                </>
            )}

 {/* == Register Step: Create Password == */}
 {nextStep === 'register' && (
                <>
                    <h2 className="card-title">Create your account</h2>
                    <p className="identifier-display">Creating account for: {identifier}</p>
                    <form onSubmit={handleFinalSubmit} className="login-form">
                        <div className="form-group">
                            <input
                                type="text"
                                id="username"
                                className="form-input"
                                placeholder="Create your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                aria-label="Create username"
                                disabled={isLoading}
                                autoFocus // Focus password field automatically
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                id="password"
                                className="form-input"
                                placeholder="Set your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                aria-label="Create password"
                                disabled={isLoading}
                                autoFocus // Focus password field automatically
                            />
                        </div>
                        {/* Optional: Add confirm password field here */}
                        <button type="submit" className="submit-button primary-button" disabled={isLoading}>
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                        <button type="button" onClick={() => { setNextStep('initial'); setError(null); setPassword(''); }} className="link-button" hidden={!userNameExists}>
                            Use a different username
                        </button>
                        <button type="button" onClick={handleGoBack} className="link-button" disabled={isLoading}>
                            Cancel
                        </button>
                    </form>
                </>
            )}

            {/* == Login Step: Enter Password == */}
            {nextStep === 'login' && (
                <>
                    <h2 className="card-title">Enter your password</h2>
                    <p className="identifier-display">Logging in as: {identifier}</p>
                    <form onSubmit={handleFinalSubmit} className="login-form">
                        <div className="form-group">
                            <input
                                type="password"
                                id="password"
                                className="form-input"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                aria-label="Password"
                                disabled={isLoading}
                                autoFocus // Focus password field automatically
                            />
                        </div>
                        <button type="submit" className="submit-button primary-button" disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                        <Link className = "back-link" onClick={(e)=>{e.preventDefault();setNextStep('initial')}} >
                            Go Back
                        </Link>
                    </form>
                </>
            )}
            {nextStep === 'details' && (
                <DetailsPage />
            )}
           
        </div>
    );
}

export default LoginCard;