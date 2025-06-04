import React, { useState } from 'react';
import './RatingModal.css'; // Create this CSS file

function RatingModal({ bookingId, cookName, onSubmitRating, onClose }) {
    const [ratingValue, setRatingValue] = useState(0);
    const [comment, setComment] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (ratingValue === 0) {
            setError("Please select a rating value (1-5 stars).");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmitRating({ bookingId, ratingValue, comment });
            // onClose(); // onSubmitRating parent will likely handle closing or success message
        } catch (err) {
            setError(err.message || "Failed to submit rating.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop-rating">
            <div className="modal-content-rating">
                <h2>Rate Your Experience with {cookName}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group-rating stars">
                        <label>Your Rating:</label>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span
                                key={star}
                                className={`star ${hoverRating >= star ? 'hover' : ''} ${ratingValue >= star ? 'selected' : ''}`}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRatingValue(star)}
                            >
                                ★
                            </span>
                        ))}
                    </div>
                    <div className="form-group-rating">
                        <label htmlFor="comment">Comment (optional):</label>
                        <textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows="4"
                            disabled={isSubmitting}
                        />
                    </div>
                    {error && <p className="error-message-rating">{error}</p>}
                    <div className="modal-actions-rating">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="button-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting || ratingValue === 0} className="button-primary">
                            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default RatingModal;