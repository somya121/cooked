import './App.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Home from './components/Home/Home';
import UserSignup from './components/UserSignup/UserSignup';
import CookProfile from './components/CookProfile/CookProfile';
import DetailsPage from './components/DetailsPage/DetailsPage';
import CookDashboard from './components/CookDashboard/CookDashboard';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { v4 as uuidv4 } from 'uuid';
import MyBookingsPage from './components/MyBookingsPage/MyBookingsPage';
import Header from './components/Header/Header';
import {setSessionExpiredCallback} from './utils/authUtils';

const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8080';
function AppContent() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authToken, setAuthToken] = useState(null);

    const [userInfo, setUserInfo] = useState(null);
    const [userNotifications, setUserNotifications] = useState([]);
    const [userStompClient, setUserStompClient] = useState(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const navigate = useNavigate();
    
    const unreadBookingNotificationCount = userNotifications.filter(
        n => !n.isRead && n.type && n.type.startsWith("BOOKING_")
    ).length;
    
     const performLogoutActions = (isSessionExpired = false) => {
        console.log(`App.js: Logging out. Session expired: ${isSessionExpired}`);
        localStorage.clear(); 
        if (isSessionExpired) {
            alert("Your session has timed out. Please log in again.");
        }
        navigate('/signin');
    };

        useEffect(() => {
        setSessionExpiredCallback(() => performLogoutActions(true));
    }, [navigate]);
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        const storedUsername = localStorage.getItem('username');
        const storedRolesString = localStorage.getItem('userRoles');
        const storedStatus = localStorage.getItem('userStatus');
        const storedIdString = localStorage.getItem('userId'); 

        if (storedToken && storedIdString) { 
            setAuthToken(storedToken);
            const roles = storedRolesString ? JSON.parse(storedRolesString) : [];
            setUserInfo({
                id: parseInt(storedIdString, 10), 
                username: storedUsername || 'User',
                roles,
                status: storedStatus || 'ACTIVE' 
            });
            setIsAuthenticated(true);
            // TODO: Consider a silent /api/users/me call here to validate token
            // and fetch fresh user info for better security and data consistency.
        }
        setIsLoadingAuth(false);
    }, []);

    useEffect(() => {
        if (isAuthenticated && userInfo && userInfo.id && authToken) { 
            console.log(`Attempting WebSocket connection for user ID: ${userInfo.id}`);
            const socket = new SockJS(`${BACKEND_BASE_URL}/ws-cookapp`);
            const client = Stomp.over(socket);
            setUserStompClient(client);

            client.connect(
                { 'Authorization': `Bearer ${authToken}` }, 
                (frame) => {
                    console.log('Connected to WebSocket (User Side): ' + frame);
                    client.subscribe(`/topic/user/${userInfo.id}/notifications`, (message) => {
                        console.log("Raw WebSocket message received for user:", message);
                        try {
                           const backendNotification = JSON.parse(message.body);
                            console.log("User received notification:", backendNotification);
                            const newNotification = {
                                ...backendNotification,
                                clientSideId: uuidv4(),
                                isRead: false,
                                timestamp: backendNotification.timestamp || new Date().toISOString()
                            };
                            setUserNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep more for AllNotifications page
                        } catch (e) { console.error("Error parsing user notification:", e); }
                    });
                },
                (error) => { console.error('STOMP connection error (User Side):', error); }
            );

            return () => {
                if (client && client.connected) {
                    client.disconnect(() => console.log("Disconnected WebSocket (User Side)"));
                }
            };
        } else {
            if (userStompClient && userStompClient.connected) {
                userStompClient.disconnect(() => console.log("Disconnected WebSocket (User Side - logging out or no ID)"));
                setUserStompClient(null);
            }
        }
    }, [isAuthenticated, userInfo, authToken]); // Dependencies for re-connecting if needed

    const handleLoginSuccess = (authData) => {
        console.log("[LOGIN_USER] AuthData received in handleLoginSuccess:", authData); 
        if (!authData || !authData.token || authData.id === undefined) { // Check for ID
            console.error("CRITICAL: Auth data, token, or user ID missing after login/registration. AuthData:", authData);
            // Optionally set an error state here to show to the user
            return;
        }
        console.log("handleLoginSuccess in App with valid token:", authData);

        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('username', authData.username || '');
        localStorage.setItem('userRoles', JSON.stringify(authData.roles || []));
        localStorage.setItem('userStatus', authData.status || '');
        localStorage.setItem('userId', authData.id.toString()); 

        const userDetails = {
            id: authData.id, 
            username: authData.username,
            roles: authData.roles || [],
            status: authData.status,
            averageRating: authData.averageRating,
            numberOfRatings: authData.numberOfRatings
        };
        console.log("[LOGIN_USER] Setting userInfo to:", userDetails);
        setAuthToken(authData.token);
        setUserInfo(userDetails);
        setIsAuthenticated(true);
        setUserNotifications([]);

        // Navigation Logic
        const isCookRolePresent = userDetails.roles.includes("ROLE_COOK");
        const isPendingCookProfile = userDetails.status === "PENDING_COOK_PROFILE";

        console.log("Navigation Logic - isCookRolePresent:", isCookRolePresent, "isPendingCookProfile:", isPendingCookProfile);

        if (isPendingCookProfile && !isCookRolePresent) {
            navigate('/cook-profile-setup');
        } else if (isCookRolePresent) {
            navigate('/cook-dashboard');
        } else {
            navigate('/details');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRoles');
        localStorage.removeItem('userStatus');
        localStorage.removeItem('userId'); // <-- Clear ID
        setAuthToken(null);
        setUserInfo(null);
        setIsAuthenticated(false);
        if (userStompClient && userStompClient.connected) { // Disconnect WebSocket on logout
            userStompClient.disconnect(() => console.log("WebSocket disconnected on logout."));
            setUserStompClient(null);
        }
        navigate('/home');
    };

    const markAllUserNotificationsAsRead = () => {
        setUserNotifications(prevNotifications =>
            prevNotifications.map(n => ({ ...n, isRead: true }))
        );
    };

    const markSingleNotificationAsRead = (notificationClientSideId) => {
        setUserNotifications(prevNotifications =>
            prevNotifications.map(n =>
                n.clientSideId === notificationClientSideId ? { ...n, isRead: true } : n
            )
        );
    };

    if (isLoadingAuth) {
        return <div className="app-loading">Loading Application...</div>;
    }
    console.log("[App.js] Unread Booking Notifications:", unreadBookingNotificationCount);
    console.log("[App.js] All User Notifications:", userNotifications);
    return (
        <div className='App'>
            {isAuthenticated && (
                <Header
                    isAuthenticated={isAuthenticated}
                    userInfo={userInfo}
                    notifications={userNotifications}
                    onMarkNotificationsAsRead={markAllUserNotificationsAsRead} // Header bell click marks all dropdown items (or all initially)
                    unreadBookingNotificationCount={unreadBookingNotificationCount}
                    onLogout={handleLogout}
                    onNavigate={(path) => navigate(path)}
                />
            )}
            <main className={isAuthenticated ? "app-content-with-header" : "app-content-no-header"}></main>
            <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/signin" element={!isAuthenticated ? <UserSignup flowType="user" onLoginSuccess={handleLoginSuccess} /> : <NavigateToCorrectPage userInfo={userInfo} />} />
                <Route path="/signup-cook" element={!isAuthenticated ? <UserSignup flowType="cook" onLoginSuccess={handleLoginSuccess} /> : <NavigateToCorrectPage userInfo={userInfo} />} />

                {/* Cook Profile Setup - Does NOT need :setupToken in URL anymore */}
                <Route path="/cook-profile-setup" element={isAuthenticated ? <CookProfile /> : <Navigate to="/signin" />} />

                <Route path="/details" element={isAuthenticated ? <DetailsPage /> : <Navigate to="/signin" />} />
                <Route path="/cook-dashboard" element={isAuthenticated && userInfo?.roles?.includes("ROLE_COOK") ? <CookDashboard /> : <Navigate to="/signin" />} />

                 <Route path="/my-bookings" element={isAuthenticated && !userInfo?.roles?.includes("ROLE_COOK") ? <MyBookingsPage /> : <Navigate to="/signin" />} />
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="*" element={<div style={{ padding: '20px', textAlign: 'center' }}><h2>404: Page Not Found</h2></div>} />
            </Routes>
        </div>
    );
}

// Helper component for redirection after login state is set
function NavigateToCorrectPage({ userInfo }) {
    const isCook = userInfo?.roles?.includes("ROLE_COOK");
    const needsProfileSetup = userInfo?.status === "PENDING_COOK_PROFILE" && !isCook;

    if (needsProfileSetup) return <Navigate to="/cook-profile-setup" replace />;
    if (isCook) return <Navigate to="/cook-dashboard" replace />;
    return <Navigate to="/details" replace />;
}

function App() {
    return ( <Router> <AppContent /> </Router> );
}
export default App;