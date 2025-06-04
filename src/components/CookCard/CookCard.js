import React from 'react';
import './CookCard.css'; 

// import defaultAvatar from './default-avatar.png'; // Example import

const defaultAvatarSrc = '/images/default-avatar.png';
const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL;
function CookCard({ cook, onBook }) {
    const {
        id,
        cookname, 
        username, 
        email = '',
        phone = '',
        expertise=[],
        availabilityStatus = 'Not specified',
        chargesPerMeal,
        averageRating,
        numberOfRatings,
        profilePicture, 
        placeName
    } = cook;

    const displayName = cookname || username || `Cook ID: ${id}`; 
    const frontDisplayName = cookname || username; 
    const frontTagline = expertise.length > 0 ? expertise[0] : "Home Cooking";
    // Determine availability class for styling
    let availabilityClass = availabilityStatus.toLowerCase().replace(/\s+/g, '-');
    const handleImageError = (e) => {
        e.target.onerror = null; 
        e.target.src = defaultAvatarSrc; 
    };
    let fullProfilePictureUrl = defaultAvatarSrc; 
    if (profilePicture && typeof profilePicture === 'string' && !profilePicture.startsWith('http')) {
        fullProfilePictureUrl = `${BACKEND_BASE_URL}${profilePicture}`;
    } else if (profilePicture && typeof profilePicture === 'string') {
        fullProfilePictureUrl = profilePicture; 
    }

        const chargesDisplay = chargesPerMeal !== null && chargesPerMeal !== undefined 
        ? `₹${chargesPerMeal}/meal` 
        : "Pricing not set";
        let ratingText = "No ratings yet";
    if (numberOfRatings > 0 && averageRating !== null && averageRating !== undefined) {
        ratingText = `★ ${averageRating.toFixed(1)} (${numberOfRatings} rating${numberOfRatings > 1 ? 's' : ''})`;
    } else if (numberOfRatings === 0) {
        ratingText = "No ratings yet";
    } else { // Fallback if data is inconsistent (e.g., averageRating present but numberOfRatings is null/undefined)
        ratingText = "Rating N/A"; 
    }
   return (
        <div className="glass-card-container"> {/* For 3D perspective */}
            <div className="glass-card">
                {/* Front of the Card */}
                <div className="glass-card-front">
                    <div className="front-background-decoration">
                        {/* You might add decorative SVG/image elements here if needed 
                            like the blurred flowers in the example. 
                            For simplicity, we'll rely on page background and card blur. */}
                    </div>
                    <img
                        src={fullProfilePictureUrl}
                        alt={`${displayName}'s profile`}
                        className="front-avatar"
                        onError={handleImageError}
                    />
                    <h2 className="front-name">{frontDisplayName}</h2>
                     <p className="front-charges">Charge - {chargesDisplay}</p>
                     <p className="front-rating">{ratingText}</p>
                    <span className="front-hover-prompt"></span>
                </div>

                <div className="glass-card-back">
                    <h3 className="back-title"> 
                            <span className={`back-tag-availability ${availabilityClass}`}>
                               {availabilityStatus}
                            </span>
                    </h3>
                    <div className="back-details-scroll"> {/* Make details scrollable if too long */}
                       
                        {expertise.length > 0 && (
                            <div className="back-detail-item">
                                <strong>Expertise:</strong> {expertise.join(', ')}
                            </div>
                        )}
                        {(email || phone) && (
                            <div className="back-detail-item contact-info-back">
                                <strong>Contact:</strong>
                                {email && <a href={`mailto:${email}`}>{email}</a>}
                                {email && phone && " / "}
                                {phone && <a href={`tel:${phone}`}>{phone}</a>}
                            </div>
                        )}
                        {/* Add any other details from the cook object here */}
                        {/* e.g., cook.shortBio, cook.yearsOfExperience, etc. */}
                        <div className="back-detail-item">
                            <strong>Charges :</strong>{chargesDisplay}
                        </div>
                        <div className="back-detail-item">
{placeName && ( // Display if available
                    <div className="back-detail-item">
                        <strong>Area:</strong> {placeName}
                    </div>
                )}
                {/* If placeName isn't available, you might show "Location: Near you" as before */}
                {!placeName && (
                     <div className="back-detail-item">
                        <strong>Location:</strong> Near you (details via booking)
                    </div>
                )}
                        </div>
                    </div>
                    <button
                        className="back-book-button"
                        onClick={() => onBook(cook)}
                    >
                        Book {displayName}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CookCard;