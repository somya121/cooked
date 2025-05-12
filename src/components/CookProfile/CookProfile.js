import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './CookProfile.css';
async function fetchApi(url, options = {}) {
    console.log("fetchApi called with:", url, options);
    const token = localStorage.getItem('authToken');
    const defaultHeaders = {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        });
        console.log("fetchApi - Response status:", response.status, response.statusText);

        let responseData = {};
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            responseData = { message: "Operation successful (no content)" };
        } else {
            try {
                responseData = await response.json();
                console.log("fetchApi - Response data:", responseData);
            } catch (jsonError) {
                console.error("fetchApi - Failed to parse JSON response:", jsonError);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} - Response body not readable.`);
                }
                console.warn("fetchApi - JSON parsing failed on likely successful response.");
                responseData = { message: "Operation successful (response not JSON)" };
            }
        }

        if (!response.ok) {
            // Use parsed message if available, otherwise status text or default
            const errorMsg = responseData?.message || response.statusText || `HTTP error! Status: ${response.status}`;
            // Throw an error object for better debugging
            const error = new Error(errorMsg);
            error.status = response.status; // Add status to error object
            error.data = responseData; // Add data if available
            throw error;
        }
        return responseData; // Return parsed data on success
    } catch (error) {
        console.error("fetchApi - Catch block error:", error);
        // Re-throw the error so the component's catch block receives it
        throw error;
    }
}

const AVAILABILITY_OPTIONS = ["Available for projects", "Busy", "Not Available"];
const EXPERTISE_LIMIT = 5; // Example limit

function CookProfile({ onLoginSuccess }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [expertiseInput, setExpertiseInput] = useState('');
    const [expertiseList, setExpertiseList] = useState([]);
    const [availability, setAvailability] = useState(AVAILABILITY_OPTIONS[0]);
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const navigate = useNavigate();

    const { setupToken } = useParams();

    useEffect(() => {
        console.log("CookProfile - Received setupToken:", setupToken);
        if (!setupToken) {
            setError("Setup token missing. Cannot complete profile.");
            // navigate('/signin');
        }
    }, [setupToken]);


    // Handler for profile image selection
    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setProfileImageFile(file);
            setError(null); // Clear previous file errors
            // Create image preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setProfileImageFile(null);
            setProfileImagePreview(null);
            setError('Please select a valid image file (jpg, png, gif).');
        }
    };

    // Handler for expertise input
    const handleAddExpertise = (e) => {
        e.preventDefault(); // Prevent form submission if inside a form
        const newExpertise = expertiseInput.trim();
        if (newExpertise && !expertiseList.includes(newExpertise) && expertiseList.length < EXPERTISE_LIMIT) {
            setExpertiseList([...expertiseList, newExpertise]);
            setExpertiseInput(''); // Clear input
        } else if (expertiseList.length >= EXPERTISE_LIMIT) {
            setError(`You can add a maximum of ${EXPERTISE_LIMIT} expertise tags.`);
        }
    };

    const handleRemoveExpertise = (expertiseToRemove) => {
        setExpertiseList(expertiseList.filter(exp => exp !== expertiseToRemove));
    };

    // Handler for "Use Current Location" button
    const handleUseCurrentLocation = () => {
        setIsLocating(true);
        setError(null); // Clear previous location errors
        setLatitude(null);
        setLongitude(null);

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude);
                setLongitude(position.coords.longitude);
                setIsLocating(false);
                // Clear manual address if current location is used (optional)
                // setManualAddress({ street: '', city: '', state: '', postalCode: '', country: '' });
            },
            (geoError) => {
                console.error("Geolocation Error:", geoError);
                let message = 'Could not get current location.';
                // ... (switch statement for error codes as in DetailsPage) ...
                setError(message);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };


    const uploadProfileImage = async (fileToUpload) => {
        setIsUploadingImage(true); // Indicate image upload start
        setError(null); // Clear previous errors

        const formData = new FormData();
        formData.append('image', fileToUpload); // 'image' must match @RequestParam("image") in backend

        const token = localStorage.getItem('authToken');
        console.log("Token retrieved for image upload: (154)", token);
        if (!token) {
            throw new Error("Authentication token not found. Please log in again.");
        }
        try {
            console.log("Attempting to upload image...");
            const response = await fetch('http://localhost:8080/api/users/me/profile/picture', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            console.log("Image upload response status:", response.status);

            // Try to parse JSON even for errors, backend might send { message: "..." }
            let responseData = {};
            try {
                responseData = await response.json();
                console.log("Image upload response data:", responseData);
            } catch (e) {
                console.warn("Could not parse JSON from image upload response");
            }


            if (!response.ok) {
                // Throw specific error from backend if possible
                throw new Error(responseData.message || `Image upload failed with status: ${response.status}`);
            }

            console.log("Image upload successful:", responseData);
            // Optionally display a temporary success message for image upload
            // setSuccessMessage("Image uploaded successfully!"); // Or just let the final save handle it

            // No need to return URL if backend associates it with the user automatically
            // return responseData.imageUrl; // Uncomment if backend returns the URL

        } catch (uploadError) {
            console.error("Image upload failed:", uploadError);
            // Set error state to show failure to the user
            setError(`Image upload failed: ${uploadError.message || 'Please try again.'}`);
            throw uploadError; // Re-throw to stop the main handleSubmit if critical
        } finally {
            setIsUploadingImage(false);
        }
    };
    // Handler for form submission
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage("Data saved succesfully!");
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError("Not authenticated. Please log in.");
            setIsLoading(false);
            return;
        }

        if (latitude === null || longitude === null) {
            setError("Please provide your location using one of the methods.");
            setIsLoading(false);
            return;
        }


        try {
            if (profileImageFile) {
                console.log("Profile image file selected, attempting upload...");
                await uploadProfileImage(profileImageFile);
                console.log("Image upload step completed (or skipped).");
            } else {
                console.log("No new profile image selected.");
            }
            const profileData = {
                name,
                phone,
                expertise: expertiseList,
                availabilityStatus: availability,
                latitude,
                longitude,
            };
            const responseData = await fetchApi('http://localhost:8080/api/users/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData),
            });
            setSuccessMessage(responseData.message || "Profile updated successfully!");
            setTimeout(() => {
                navigate('/details'); // Navigate to cook list or dashboard
            }, 1500);

        } catch (err) {
            console.error("handleSubmit Error:", err);
            let errorMessage = "Failed to save profile. Please try again.";
            if (err?.message) { errorMessage = err.message; }
            setError(errorMessage);
            setSuccessMessage(null);
        }
        finally { setIsLoading(false); }
    };
    const isSaveDisabled = isLoading || isLocating;
    return (
        < div className="cook-profile-setup-container">
            <h2>Set Up Your Cook Profile</h2>

            {error && <p className="error-message">{error}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="profile-form">

                {/* Profile Image */}
                <div className="form-group form-group-image">
                    <label htmlFor="profileImage">Profile Picture</label>
                    <div className="image-preview-container">
                        {profileImagePreview ? (
                            <img src={profileImagePreview} alt="Profile Preview" className="image-preview" />
                        ) : (
                            <div className="image-placeholder">No Image</div>
                        )}
                        <input
                            type="file"
                            id="profileImage"
                            accept="image/png, image/jpeg, image/gif"
                            onChange={handleImageChange}
                            disabled={isLoading}
                        />
                        {/* Button style depends on your CSS */}
                        <button type="button" onClick={() => document.getElementById('profileImage').click()} disabled={isLoading}>
                            Choose Image
                        </button>
                        {/* Add separate upload button if handling upload separately */}
                        {/* {profileImageFile && <button type="button" onClick={handleImageUpload}>Upload Image</button>} */}
                    </div>
                </div>

                {/* Name */}
                <div className="form-group">
                    <label htmlFor="name">Display Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isLoading}
                        maxLength={100}
                    />
                </div>

                {/* Phone */}
                <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                        type="tel" // Use tel type
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        placeholder="(optional)"
                    />
                </div>

                {/* Expertise */}
                <div className="form-group">
                    <label htmlFor="expertise">Expertise (e.g., Indian, Italian, Baking)</label>
                    <div className="expertise-input-group">
                        <input
                            type="text"
                            id="expertise"
                            value={expertiseInput}
                            onChange={(e) => setExpertiseInput(e.target.value)}
                            disabled={isLoading || expertiseList.length >= EXPERTISE_LIMIT}
                            maxLength={50}
                            placeholder={`Add up to ${EXPERTISE_LIMIT} tags`}
                        />
                        <button
                            type="button" // Prevent form submission
                            onClick={handleAddExpertise}
                            disabled={isLoading || !expertiseInput.trim() || expertiseList.length >= EXPERTISE_LIMIT}
                            className="add-tag-button"
                        >
                            Add
                        </button>
                    </div>
                    <div className="expertise-tags-display">
                        {expertiseList.map((exp, index) => (
                            <span key={index} className="tag expertise-tag">
                                {exp}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveExpertise(exp)}
                                    className="remove-tag-button"
                                    aria-label={`Remove ${exp}`}
                                    disabled={isLoading}
                                >
                                    × {/* Multiplication sign for 'x' */}
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Availability */}
                <div className="form-group">
                    <label htmlFor="availability">Availability Status</label>
                    <select
                        id="availability"
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        required
                        disabled={isLoading}
                    >
                        {AVAILABILITY_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>

                {/* Location */}
                <div className="form-group form-group-location">
                    <label>Your Location</label>
                    <p className="location-info">
                        {latitude !== null && longitude !== null
                            ? `Current: Lat ${latitude.toFixed(5)}, Lon ${longitude.toFixed(5)}`
                            : "Location not set."}
                    </p>
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLoading || isLocating}
                        className="location-button"
                    >
                        {isLocating ? 'Getting Location...' : 'Use Current Location'}
                    </button>
                    {/* Add Manual Address Inputs or Place Autocomplete Here if needed */}
                    {/* Example Manual Inputs:
                    <input type="text" placeholder="Street Address" ... />
                    <input type="text" placeholder="City" ... />
                    ... etc ...
                    */}
                </div>


                {/* Submit Button */}
                <div className="form-actions">
                    <button type="submit" className="submit-button primary-button" disabled={isLoading || isLocating}>
                        {isLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CookProfile;