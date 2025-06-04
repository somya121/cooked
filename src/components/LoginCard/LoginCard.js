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
    const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8080';
    const navigate = useNavigate();

    const handleContinue = async (event) => {
        if (event) event.preventDefault();
        setIsLoading(true);
        setError(null);
        const backendUrl = '/api/auth/check-identifier';
        console.log('LoginCard - handleContinue - Email to check:', identifier);
        console.log('Continue with:', identifier);
        if (flowType === 'user') {

             setNextStep('register'); 
        } else { 
            setNextStep('register');
        }

        setIsLoading(false); // Stop loading after check/decision
    

        try {
            console.log(`Sending identifier (email) to backend: ${identifier}`);
            const response = await fetch(`${BACKEND_BASE_URL}${backendUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier: identifier}),
            });

            const responseData = await response.json();
            console.log("LoginCard - handleContinue - /check-identifier Raw Response Status:", response.status);
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
            url = `${BACKEND_BASE_URL}/api/auth/login`;
            payload = { identifier, password }; // 'identifier' here is the email from state
            actionVerb = "Login";
        } else { // register step
            payload = { identifier, username, password }; // 'identifier' here is the email from state
            if (flowType === 'cook') {
                url = `${BACKEND_BASE_URL}/api/auth/register/cook`;
                actionVerb = "Cook Registration Initiation";
            } else {
                url = `${BACKEND_BASE_URL}/api/auth/register/user`;
                actionVerb = "User Registration";
            }
        }

        console.log(`Submitting ${actionVerb} to ${url} with payload:`, payload);
        try {
            // *** 1. Make the fetch call AND GET THE RAW RESPONSE ***
            const response = await fetch(url, { // Assign to 'response'
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            // *** 2. PARSE THE JSON BODY FROM THE RESPONSE ***
            const responseData = await response.json(); // This was missing

            // *** 3. CHECK IF THE RESPONSE WAS OK (HTTP 2xx status) ***
            if (!response.ok) {
                // If not ok, throw an error using the message from the parsed JSON body
                throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
            }

            // --- Success ---
            console.log(`${actionVerb} API Response Data (parsed):`, responseData); // Log the parsed data
            console.log(`${actionVerb} Successful`); // Simplified success log

            if (typeof onLoginSuccess === 'function') {
                onLoginSuccess(responseData); // Pass the PARSED JSON data up
            } else {
                console.error("CRITICAL: onLoginSuccess callback is missing in LoginCard!");
                setError("Login/Registration succeeded, but navigation failed. Please try refreshing.");
            }
        } catch (err) {
            console.error(`${actionVerb} failed:`, err);
            // The err.message should now correctly come from the backend's JSON response if !response.ok
            // or from network/parsing errors.
            setError(err.message || `An unexpected error occurred.`);

            // Keep user on the current form for retry
            if (nextStep === 'register' && (err.message?.includes("taken") || err.message?.includes("exists"))) {
                // Specific error for already taken username/email
            } else if (nextStep === 'login' && (err.message?.includes("Invalid") || err.status === 401 || err.status === 403)) {
                // Login specific error
            } else if (nextStep === 'register') {
                // Other registration error
            } else {
                // Fallback to login step if it was a login attempt and error was not specific
                setNextStep('login');
            }
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
                    <h2>{flowType === 'cook' ? 'Cook Sign Up / Login In' : 'Sign In or Sign Up'}</h2>
                    <form onSubmit={handleContinue} className="login-form">
                        <p>Please enter your email to continue:</p>
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
                            {isLoading ? 'Processing...' : 'Continue'}
                        </button>
                    </form>
                </>
            )}

 {nextStep === 'register' && (
                <>
                    <h2>Create Account {flowType === 'cook' ? '(as a Cook)' : ''}</h2>
                    <p className="identifier-display">Email: {identifier}</p>
                    <form onSubmit={handleFinalSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="usernameReg">Username</label>
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
                            <label htmlFor="passwordReg">Password</label>
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
                        <button type="submit" className="submit-button primary-button" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Account'}
                        </button>
                        <button type="button" onClick={() => { setNextStep('initial'); setError(null); setPassword(''); }} className="link-button" hidden={!userNameExists}>
                            Use a different username
                        </button>
                        <button type="button" onClick={handleGoBack} className="link-button" disabled={isLoading}>
                            Back to email entry
                        </button>
                    </form>
                </>
            )}

            {nextStep === 'login' && (
                <>
                    <h2>Sign In</h2>
                    <p className="identifier-display">Email: {identifier}</p>
                    <form onSubmit={handleFinalSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="passwordLogin">Password</label>
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
                        <button type="button" onClick={handleGoBack} className="link-button" disabled={isLoading}>
                            Use a different email
                        </button>
                         {/* Option to go to registration if they don't have an account */}
                         <p style={{marginTop: '10px', fontSize: '0.9em'}}>
                             New here? <button type="button" onClick={() => setNextStep('register')} className="link-button">Create an account</button>
                         </p>
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