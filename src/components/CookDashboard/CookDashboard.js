import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import './CookDashboard.css';
import { triggerSessionExpiredLogout } from '../../utils/authUtils';

const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL;

async function fetchApi(url, options = {}) {
    const token = localStorage.getItem('authToken'); 
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }) 
    };
const fullUrl = `${BACKEND_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers, 
            },
        });
        if (response.status === 401) {
            triggerSessionExpiredLogout();
            throw new Error("Session expired. Please log in again.");
        }
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error; 
    }
}


function CookDashboard() {
    const [myProfile, setMyProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState(null);
    const [isLoadingBookings, setIsLoadingBookings] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [cookUserId, setCookUserId] = useState(null);
    const [dataLoadError, setDataLoadError] = useState(null);
    const [userId, setUserId] = useState([]);
    const [cookNotifications, setCookNotifications] = useState([]);
        const [detectedPlaceName, setDetectedPlaceName] = useState('');
        const [isLocating, setIsLocating] = useState(false);
            const [latitude, setLatitude] = useState(null);
                const [longitude, setLongitude] = useState(null);
            

    const navigate = useNavigate();

    useEffect(() => {
        console.log("CookDashboard: Attempting to get cookUserId from localStorage.");
        let id = null;
        const storedUserInfoString = localStorage.getItem('userInfo');
        if (storedUserInfoString) {
            try {
                const storedUserInfo = JSON.parse(storedUserInfoString);
                if (storedUserInfo && storedUserInfo.id) {
                    id = storedUserInfo.id;
                }
            } catch (e) {
                console.error("CookDashboard: Error parsing 'userInfo' from localStorage:", e);
            }
        }
        if (!id) {
            const storedId = localStorage.getItem('userId');
            if (storedId) {
                id = parseInt(storedId, 10);
            }
        }

        if (id) {
            setCookUserId(id);
            console.log("CookDashboard: cookUserId set to:", id);
        } else {
            console.warn("CookDashboard: Cook User ID NOT FOUND in localStorage.");
        }
    }, []);

    useEffect(() => {
        const loadInitialDashboardData = async () => {
            console.log("CookDashboard: Loading initial dashboard data (profile & bookings)...");
            setIsLoadingData(true);
            setDataLoadError(null);
            try {
                // Fetch profile data
                const profileData = await fetchApi('/api/users/me/profile');
                setMyProfile(profileData); // profileData can be null if 204
                console.log("CookDashboard: Profile data fetched:", profileData);


                const bookingData = await fetchApi('/api/bookings/cook/me');
                setBookings(Array.isArray(bookingData) ? bookingData : []);
                console.log("CookDashboard: Bookings data fetched:", bookingData);

            } catch (err) {
                setDataLoadError("Could not load dashboard data. " + err.message);
                console.error("CookDashboard: Initial data load error:", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadInitialDashboardData();
    }, []);

    useEffect(() => {
        if (!cookUserId) {
            console.log("CookDashboard WS: cookUserId not available. Waiting for it to be set.");
            return; // Don't connect if cookUserId isn't set
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn("CookDashboard WS: No auth token for WebSocket connection. Cannot connect.");
            return;
        }

        console.log(`CookDashboard WS: Attempting connection for cookUserId: ${cookUserId}`);
        const socket = new SockJS(`${BACKEND_BASE_URL}/ws-cookapp`);
        const stompClientInstance = Stomp.over(socket); 

        stompClientInstance.connect(
            { 'Authorization': `Bearer ${token}` },
            (frame) => {
                console.log('CookDashboard WS: Connected to WebSocket: ' + frame);


                stompClientInstance.subscribe(`/topic/cook/${cookUserId}/notifications`, (message) => {
                    console.log("CookDashboard WS: Raw message received:", message.body);
                    try {
                        const notification = JSON.parse(message.body);
                        console.log("CookDashboard WS: Parsed cook notification:", notification);


                        const newNotificationWithId = {
                            ...notification,
                            timestamp: notification.timestamp || new Date().toISOString(),
                            clientSideId: Date.now().toString() + Math.random().toString(16).slice(2)
                        };

                         setCookNotifications(prevNotifications => 
                            [newNotificationWithId, ...prevNotifications].slice(0, 5) 
                        ); 

                       
                        if (notification.type && (notification.type === "NEW_BOOKING_REQUEST" || notification.type.startsWith("BOOKING_"))) {
                            console.log("CookDashboard WS: Refreshing bookings due to notification type:", notification.type);
                            fetchApi(`/api/bookings/cook/me`)
                                .then(data => setBookings(Array.isArray(data) ? data : []))
                                .catch(err => console.error("CookDashboard WS: Error re-fetching bookings after notification:", err));
                        }

                    } catch (e) {
                        console.error("CookDashboard WS: Error parsing cook notification message:", e, "Body:", message.body);
                    }
                });
            },
            (error) => {
                console.error('CookDashboard WS: STOMP connection error:', error);
            }
        );


        return () => {
            if (stompClientInstance && stompClientInstance.connected) {
                console.log("CookDashboard WS: Disconnecting WebSocket due to component unmount or cookUserId change.");
                stompClientInstance.disconnect(() => {
                    console.log("CookDashboard WS: WebSocket disconnected.");
                });
            }
        };
    }, [cookUserId]);


    useEffect(() => {
        const loadBookings = async () => {
            setIsLoadingBookings(true);
            setFetchError(null);
            try {
                const data = await fetchApi('/api/bookings/cook/me');
                setBookings(data || []);
            } catch (err) {
                setFetchError("Could not load your bookings.");
                console.error("Error fetching cook bookings:", err);
            } finally {
                setIsLoadingBookings(false);
            }
        };
        loadBookings();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const cookUserId = userInfo?.id;

        if (!token || !cookUserId) return;

        const socket = new SockJS(`${BACKEND_BASE_URL}/ws-cookapp`);
        const stompClient = Stomp.over(socket);

        stompClient.connect(
            { 'Authorization': `Bearer ${token}` },
            (frame) => {
                console.log('Connected to WebSocket (Cook): ' + frame);

                stompClient.subscribe(`/topic/cook/${cookUserId}/notifications`, (message) => {
                    const notification = JSON.parse(message.body);
                    console.log("Cook received notification:", notification);
                    setNotifications(prev => [notification, ...prev]);
                });
            },
            (error) => {
                console.error('STOMP error:', error);
            }
        );

        return () => {
            if (stompClient && stompClient.connected) {
                stompClient.disconnect(() => {
                    console.log("Disconnected WebSocket (Cook)");
                });
            }
        };
    }, []);

    useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const profileData = await fetchApi('/api/users/me/profile');
                setMyProfile(profileData);
                console.log("CookDashboard: Profile data fetched:", profileData);

                const bookingData = await fetchApi('/api/bookings/cook/me');
                setBookings(bookingData || []);
                console.log("Cook Dashboard loaded (profile/bookings would be fetched here).", bookingData);

            } catch (err) {
                setError("Could not load dashboard data.");
                console.error("Dashboard load error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadDashboardData();
    }, []);


    const handleBookingStatusUpdate = async (bookingId, newStatus) => {
        console.log(`CookDashboard: Attempting to ${newStatus} booking ${bookingId}`);
        const originalBookings = [...bookings]; // For potential revert on error
        // Set loading state for the specific booking item (optional, for UI feedback)
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, _isUpdatingStatus: true } : b));

        try {
            await fetchApi(`/api/bookings/${bookingId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ newStatus: newStatus.toUpperCase() }),
            });

            // Refresh the entire bookings list to ensure UI consistency
            const updatedBookingData = await fetchApi('/api/bookings/cook/me');
            setBookings(Array.isArray(updatedBookingData) ? updatedBookingData : []);

            // alert(`Booking ${newStatus.toLowerCase()}ed!`); // Or use a more subtle notification
        } catch (err) {
            alert(`Failed to ${newStatus.toLowerCase()} booking: ${err.message}`);
            console.error(`CookDashboard: Error ${newStatus.toLowerCase()}ing booking:`, err);
            setBookings(originalBookings); // Revert to original bookings on error
        } finally {
            // Remove loading state for the specific booking item
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, _isUpdatingStatus: false } : b));
        }
    };

    const handleMarkServiceComplete = async (bookingId) => {
        try {
            await fetchApi(`/api/bookings/${bookingId}/complete-service`, { method: 'PUT' });
            // Refresh bookings or update state
            const updatedBookingData = await fetchApi('/api/bookings/cook/me');
            setBookings(Array.isArray(updatedBookingData) ? updatedBookingData : []);
        } catch (err) {
            alert(`Failed to mark service complete: ${err.message}`);
        }
    };

    const handleMarkPaymentReceived = async (bookingId) => {
        try {
            await fetchApi(`/api/bookings/${bookingId}/receive-payment`, { method: 'PUT' });
            // Refresh bookings or update state
            const updatedBookingData = await fetchApi('/api/bookings/cook/me');
            setBookings(Array.isArray(updatedBookingData) ? updatedBookingData : []);
            alert("Payment marked as received. User will be notified to rate.");
            // Potentially navigate away or update UI further
        } catch (err) {
            alert(`Failed to mark payment as received: ${err.message}`);
        }
    };


    if (isLoadingBookings) return <div>Loading your bookings...</div>;
    if (fetchError) return <div className="error-message">{fetchError}</div>;
    if (isLoading) return <div>Loading Cook Dashboard...</div>;

    return (
        <div className="cook-dashboard-container">
            <div className="dashboard-header">
                <h1>My Cook Dashboard</h1>
                <button onClick={() => navigate('/cook-profile-setup')} className="edit-profile-button">
                    Edit My Profile
                </button>
            </div>

            {myProfile && (
                <section className="profile-summary-card">
                    <h2>Welcome, {myProfile.cookname || 'Cook'}!</h2>
                    <p><strong>Status:</strong> <span className={`availability-status status-${myProfile.availabilityStatus?.toLowerCase().replace(/\s+/g, '-')}`}>{myProfile.availabilityStatus || "Not Set"}</span></p>
                    {myProfile.expertise && myProfile.expertise.length > 0 && (
                        <p><strong>Expertise:</strong> {myProfile.expertise.join(', ')}</p>
                        
                    )}
                    {myProfile.placeName && <p><strong>Location:</strong> {myProfile.placeName}</p>}                         
                </section>
            )}

            {/* <section className="notifications-preview-cook">
                <h2>Recent Activity</h2>
                {cookNotifications.length > 0 ? (
                    cookNotifications.map((n) => (
                        <p key={n.clientSideId || n.timestamp + Math.random()} className="notification-item-cook">
                            {n.message}
                            <span className="notification-timestamp-cook">
                                ({n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'})
                            </span>
                        </p>
                    ))
                ) : (
                    <p className="no-notifications-cook">No new activity.</p>
                )}
            </section> */}

            <section className="bookings-management">
                <h2>My Booking Requests</h2>
                {bookings.length > 0 ? (
                    <div className="cook-bookings-grid">
                        {bookings.map(booking => (
                            <div key={booking.id} className={`cook-booking-card status-bg-${booking.bookingStatus?.toLowerCase()}`}>
                                <div className="cook-booking-card-header">
                                    <h3>Booking for: {booking.customerName || booking.customerUsername}</h3>
                                    <span className={`booking-status-cook status-text-${booking.bookingStatus?.toLowerCase()}`}>{booking.bookingStatus}</span>
                                </div>
                                <div className="cook-booking-card-body">
                                    <p><strong>Address:</strong> {booking.customerAddress}</p>
                                    {booking.mealPreference && <p><strong>Preference:</strong> {booking.mealPreference}</p>}
                                    <p><strong>Requested:</strong> {booking.requestedDateTime ? new Date(booking.requestedDateTime).toLocaleString() : 'ASAP'}</p>
                                </div>
                                {booking.bookingStatus === 'PENDING' && (
                                    <div className="cook-booking-actions">
                                        <button
                                            onClick={() => handleBookingStatusUpdate(booking.id, 'ACCEPTED')}
                                            className="action-button accept"
                                            disabled={booking._isLoading}
                                        >
                                            {booking._isLoading ? 'Processing...' : 'Accept'}
                                        </button>
                                        <button
                                            onClick={() => handleBookingStatusUpdate(booking.id, 'REJECTED')}
                                            className="action-button reject"
                                            disabled={booking._isLoading}
                                        >
                                            {booking._isLoading ? 'Processing...' : 'Reject'}
                                        </button>
                                    </div>
                                )}
                                {booking.bookingStatus === 'ACCEPTED' && !booking.serviceCompletedAt && (
                                    <button
                                        onClick={() => handleMarkServiceComplete(booking.id)}
                                        className="action-button service-complete"
                                        disabled={booking._isLoading}
                                    >
                                        Mark Service Complete
                                    </button>
                                )}
                                {booking.serviceCompletedAt && !booking.paymentCompletedAt && (
                                    <div className="payment-status-cook">
                                        <p>Service Complete. Awaiting Payment: <strong>₹{booking.totalCharges?.toFixed(2) || 'N/A'}</strong></p>
                                        <button
                                            onClick={() => handleMarkPaymentReceived(booking.id)}
                                            className="action-button payment-received"
                                            disabled={booking._isLoading}
                                        >
                                            Mark Payment Received (Cash)
                                        </button>
                                    </div>
                                )}
                                {booking.paymentCompletedAt && (
                                    <p className="status-text-completed">Service & Payment Complete</p>
                                )}
                                <div className="cook-booking-card-footer">
                                    <p>ID: {booking.id}</p>
                                    <p>Received: {new Date(booking.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-bookings-cook">You have no booking requests at the moment.</p>
                )}
            </section>
        </div>
    );
}
export default CookDashboard;