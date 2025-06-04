import React, { useState, useEffect } from 'react';
import './MyBookingsPage.css'; 
import RatingModal from '../RatingModal/RatingModal';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
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



function MyBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [bookingToRate, setBookingToRate] = useState(null); 
    const [ratingSuccess, setRatingSuccess] = useState('');
    const [ratingError, setRatingError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [bookingToDeleteId, setBookingToDeleteId] = useState(null);


 const openRatingModalForBooking = (booking) => {
        setBookingToRate({ 
            bookingId: booking.id, 
            cookName: booking.cookUsername, 
            cookId: booking.cookId 
        });
        setShowRatingModal(true);
        setRatingError('');
        setRatingSuccess('');
    };
 const handleRatingSubmit = async (ratingData) => {
        setRatingError('');
        setRatingSuccess('');
        try {
            await fetchApi('/api/ratings', {
                method: 'POST',
                body: JSON.stringify(ratingData),
            });
            setRatingSuccess("Thank you for your rating!");
            setShowRatingModal(false);
            setBookings(prevBookings => 
                prevBookings.map(b => 
                    b.id === ratingData.bookingId 
                        ? { ...b, ratedByCurrentUser: true } 
                        : b
                )
            );
            setBookingToRate(null);

        } catch (err) {
            setRatingError(err.message || "Failed to submit rating.");

        }
    };

    useEffect(() => {
        const loadUserBookings = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchApi('/api/bookings/user/me');
                setBookings(Array.isArray(data) ? data : []);
            } catch (err) {
                setError("Could not load your bookings. " + err.message);
                console.error("Error fetching user bookings:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadUserBookings();
    }, []);

    const handleDeleteBooking = async (bookingId) => {
        // Highly recommended: Add a confirmation dialog here!
        if (!window.confirm("Are you sure you want to cancel this booking?")) {
            return;
        }

        setActionMessage(''); // Clear previous messages
        try {
            await fetchApi(`/api/bookings/${bookingId}`, {
                method: 'DELETE',
            });
            setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId));
            setActionMessage("Booking cancelled successfully.");
            setTimeout(() => setActionMessage(''), 3000); // Clear message after 3s
        } catch (err) {
            console.error("Error deleting booking:", err);
            setActionMessage(`Failed to cancel booking: ${err.message}`);
            // Don't clear error immediately, let user see it
        }
    };

     const promptDeleteBooking = (bookingId) => {
        setBookingToDeleteId(bookingId);
        setIsConfirmModalOpen(true);
        setActionMessage(''); // Clear previous messages
    };
    if (isLoading) return <div className="status-message-bookings">Loading your bookings...</div>;
    if (error) return <div className="error-message-bookings">{error}</div>;
    const confirmDeleteBooking = async () => {
        if (!bookingToDeleteId) return;

        try {
            await fetchApi(`/api/bookings/${bookingToDeleteId}`, {
                method: 'DELETE',
            });
            setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingToDeleteId));
            setActionMessage("Booking cancelled successfully.");
            setTimeout(() => setActionMessage(''), 3000);
        } catch (err) {
            console.error("Error deleting booking:", err);
            setActionMessage(`Failed to cancel booking: ${err.message}`);
        } finally {
            setIsConfirmModalOpen(false);
            setBookingToDeleteId(null);
        }
    }
    return (
        <div className="my-bookings-page-container">
            <h1 className="my-bookings-title">My Bookings</h1>
            {ratingSuccess && <p className="success-message-bookings">{ratingSuccess}</p>}
            {ratingError && <p className="error-message-bookings">{ratingError}</p>}
            {bookings.length > 0 ? (
                <div className="bookings-grid">
                    {bookings.map(booking => (
                        <div key={booking.id} className="booking-card-user">
                            {(booking.bookingStatus === 'PENDING' || booking.bookingStatus === 'ACCEPTED') && !booking.serviceCompletedAt && (
                                <button 
                                    onClick={() => promptDeleteBooking(booking.id)} 
                                    className="delete-booking-button"
                                    title="Cancel Booking"
                                >
                                    × 
                                </button>
                            )}
                            <div className="booking-card-header">
                                <h3>Cook: {booking.cookUsername || 'N/A'}</h3>
                                <span className={`booking-status status-${booking.bookingStatus?.toLowerCase()}`}>
                                    {booking.bookingStatus}
                                </span>
                            </div>
                            <div className="booking-card-body">
                                <p><strong>Requested:</strong> {booking.requestedDateTime ? new Date(booking.requestedDateTime).toLocaleString() : 'ASAP'}</p>
                                <p><strong>Your Name (for this booking):</strong> {booking.customerName}</p>
                                <p><strong>Address:</strong> {booking.customerAddress}</p>
                                {booking.mealPreference && <p><strong>Preference:</strong> {booking.mealPreference}</p>}
                            </div>
                            <div className="booking-card-footer">
                                <p className="booking-id">ID: {booking.id}</p>
                                <p className="booking-date">Booked: {new Date(booking.createdAt).toLocaleDateString()}</p>
                            </div>
                            {booking.serviceCompletedAt && !booking.paymentCompletedAt && (
                                <div className="payment-due-user">
                                    <p><strong>Status:</strong> Service Complete. Payment of <strong>₹{booking.totalCharges?.toFixed(2) || 'N/A'}</strong> is due.</p>
                                    <p className="small-text">Please pay the cook in cash upon their arrival or as agreed.</p>
                                </div>
                            )}
{booking.paymentCompletedAt && booking.bookingStatus === 'COMPLETED' && !booking.ratedByCurrentUser && ( // Check ratedByCurrentUser
                        <div className="rate-service-user">
                            <p>Payment Confirmed! How was your experience with {booking.cookUsername}?</p>
                            <button 
                                onClick={() => openRatingModalForBooking(booking)}
                                className="rate-cook-button"
                            >
                                Rate {booking.cookUsername}
                            </button>
                        </div>
                    )}
                    {/* Show if already rated */}
                    {booking.paymentCompletedAt && booking.bookingStatus === 'COMPLETED' && booking.ratedByCurrentUser && (
                        <div className="rated-service-user">
                            <p><strong>Status:</strong> You've rated this service. Thank you!</p>
                        </div>
                    )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-bookings-message">You have no active bookings.</p>
            )}
             {showRatingModal && bookingToRate && (
                <RatingModal
                    bookingId={bookingToRate.bookingId}
                    cookName={bookingToRate.cookName}
                    onSubmitRating={handleRatingSubmit}
                    onClose={() => {
                        setShowRatingModal(false);
                        setBookingToRate(null);
                        setRatingError(''); // Clear error when closing manually
                    }}
                />
            )}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => {
                    setIsConfirmModalOpen(false);
                    setBookingToDeleteId(null);
                }}
                onConfirm={confirmDeleteBooking}
                title="Confirm Cancellation"
                message="Are you sure you want to cancel this booking?"
                confirmText="Yes, Cancel Booking"
                cancelText="No, Keep It"
            />
        </div>
    );
}

export default MyBookingsPage;