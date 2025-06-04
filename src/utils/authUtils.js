/**
 * @file authUtils.js
 * Provides utility functions for managing global authentication side-effects,
 * like handling session expiration.
 */

/**
 * Stores the callback function to be executed when a session/token is detected as expired.
 * This callback is typically set by the main App component and will handle clearing
 * auth state and redirecting the user.
 * @type {function}
 */
let onSessionExpiredCallback = () => {
    // Default fallback behavior if no callback is set (shouldn't happen in a configured app)
    console.error(
        "onSessionExpiredCallback was not set by the main application. " +
        "Attempting a basic localStorage clear and redirect to /signin."
    );
    try {
        localStorage.clear(); // Clears all localStorage for the origin
    } catch (e) {
        console.error("Error clearing localStorage during fallback logout:", e);
    }
    // Crude redirect as a last resort
    if (window.location.pathname !== '/signin' && window.location.pathname !== '/home') {
         window.location.href = '/signin'; 
    }
};

/**
 * Sets the global callback function to be executed when a session/token expires.
 
 * @param {function} callback 
 *                            
 *                            
 *                             
 *                              
 *                            
 */
export const setSessionExpiredCallback = (callback) => {
    if (typeof callback === 'function') {
        onSessionExpiredCallback = callback;
        console.log("authUtils: Session expired callback has been set.");
    } else {
        console.error("authUtils: Invalid callback provided to setSessionExpiredCallback. Must be a function.");
    }
};

export const triggerSessionExpiredLogout = () => {
    console.warn("authUtils: Session/Token expired or unauthorized access detected. Triggering global logout actions.");
    onSessionExpiredCallback(); // Execute the callback set by App.js
};
