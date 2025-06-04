import React, { useState } from 'react';
import './BookingFormModal.css'; // Create this CSS file

function BookingFormModal({ cookName, onClose, onSubmit }) {
    const [customerName, setCustomerName] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [mealPreference, setMealPreference] = useState('');
    const [requestedDateTime, setRequestedDateTime] = useState(''); // For <input type="datetime-local" />
    const [isLoading, setIsLoading] = useState(false); // For form submission loading

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await onSubmit({
            customerName,
            customerAddress,
            mealPreference,
            requestedDateTime: requestedDateTime ? new Date(requestedDateTime).toISOString() : null,
        });
        setIsLoading(false);
        // Parent component (DetailsPage) will handle closing or success/error messages
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Book {cookName}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="customerName">Your Name:</label>
                        <input
                            type="text"
                            id="customerName"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="customerAddress"> Address:</label>
                        <textarea
                            id="customerAddress"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            required
                            rows="3"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="mealPreference">Meal Preference (optional):</label>
                        <input
                            type="text"
                            id="mealPreference"
                            value={mealPreference}
                            onChange={(e) => setMealPreference(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="requestedDateTime">Requested Date & Time (optional):</label>
                        <input
                            type="datetime-local" // Basic datetime picker
                            id="requestedDateTime"
                            value={requestedDateTime}
                            onChange={(e) => setRequestedDateTime(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={isLoading} className="button-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="button-primary">
                            {isLoading ? 'Sending Request...' : 'Send Booking Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default BookingFormModal;