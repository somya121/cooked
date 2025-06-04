import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CookProfile.css';


const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8080';

async function fetchApi(urlPath, options = {}) {
    console.log("fetchApi (CookProfile scope) called with path:", urlPath, "and options:", options);
    const token = localStorage.getItem('authToken');
    const defaultHeaders = {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
    const fullUrl = `${BACKEND_BASE_URL}${urlPath.startsWith('/') ? urlPath : '/' + urlPath}`;
        try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers },
        });
        console.log("fetchApi - Response status:", response.status, response.statusText, "for URL:", fullUrl);

        if (!response.ok) {
            let errorData;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                try { errorData = await response.json(); } catch (e) { errorData = { message: response.statusText || "Server error, could not parse JSON error." }; }
            } else {
                const errorText = await response.text(); console.error("fetchApi - Non-JSON error response text (!ok):", errorText);
                errorData = { message: response.statusText || `Server error (${response.status}), response not JSON.` };
            }
            const error = new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            error.status = response.status; error.data = errorData;
            throw error;
        }
        if (response.status === 204 || (response.headers.get('content-length') && parseInt(response.headers.get('content-length')) === 0)) {
            return options.method === 'GET' ? null : { message: "Operation successful (no content)" };
        }
        try {
            const responseData = await response.json(); return responseData;
        } catch (jsonError) {
            console.error("fetchApi - Failed to parse JSON on successful-status response. URL:", fullUrl, "Error:", jsonError.message);
            const responseText = await response.text(); console.error("fetchApi - Actual non-JSON response text (ok but not json):", responseText);
            throw new Error(`Server returned status ${response.status} but response was not valid JSON.`);
        }
    } catch (error) {
        console.error("fetchApi - Catch block error. URL:", fullUrl, "Error details:", error);
        throw error;
    }
}

const AVAILABILITY_OPTIONS = ["Available for projects", "Busy", "Not Available"];
const EXPERTISE_LIMIT = 5;

function CookProfile() {
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
    const [existingProfilePictureUrl, setExistingProfilePictureUrl] = useState('');
    const [successMessage, setSuccessMessage] = useState(null);
    const [isFetchingProfile, setIsFetchingProfile] = useState(true); 
    const [chargesPerMeal,setChargesPerMeal] = useState('');
    const [detectedPlaceName, setDetectedPlaceName] = useState('');
    const navigate = useNavigate();

    const fetchPlaceNameForCoords = async (latitude, longitude) => {
        if (latitude !== null && longitude !== null) {
            try {
                setDetectedPlaceName("Fetching area name...");
                const geoData = await fetchApi(`/api/location/reverse-geocode?lat=${latitude}&lon=${longitude}`);
                if (geoData && geoData.displayName) {
                    setDetectedPlaceName(geoData.displayName);
                } else {
                    setDetectedPlaceName("Could not determine area name.");
                }
            } catch (e) {
                console.error("Error fetching place name preview:", e);
                setDetectedPlaceName("Error getting area name.");
            }
        } else {
            setDetectedPlaceName('');
        }
    }


    useEffect(() => {
        const loadExistingProfile = async () => {
            setIsFetchingProfile(true);
            setError(null);
            console.log("CookProfile: Attempting to load existing profile...");
            try {
                const data = await fetchApi('/api/users/me/profile'); // GET request
                if (data) {
                    console.log("CookProfile: Existing profile data received:", data);
                    setName(data.cookname || '');
                    setPhone(data.phone || '');
                    setDetectedPlaceName(data.placeName || '');
                    setExpertiseList(Array.isArray(data.expertise) ? data.expertise : []);
                    setAvailability(data.availabilityStatus || AVAILABILITY_OPTIONS[0]);
                    setLatitude(data.latitude || null);
                    setLongitude(data.longitude || null);
                    setDetectedPlaceName(data.placeName || '')
                    setChargesPerMeal(data.chargesPerMeal !== null && data.chargesPerMeal !== undefined ? String(data.chargesPerMeal) : '');
                    if (data.profilePicture) {
                        const fullImageUrl = data.profilePicture.startsWith('http') 
                            ? data.profilePicture 
                            : `${BACKEND_BASE_URL}${data.profilePicture}`;
                        setProfileImagePreview(fullImageUrl);
                        setExistingProfilePictureUrl(fullImageUrl); 
                        console.log("CookProfile: Setting profile image preview to:", fullImageUrl);
                    } else {
                        setProfileImagePreview(null); 
                         setExistingProfilePictureUrl('');
                    }
                } else {
                    console.log("CookProfile: No existing profile data found or empty response.");
                }
            } catch (err) {
                console.error("CookProfile: Failed to load existing profile:", err);
                setError("Could not load your profile data. Please try refreshing. " + (err.message || ''));
            } finally {
                setIsFetchingProfile(false);
            }
        };

        loadExistingProfile();
    }, []);

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setProfileImageFile(file);
            setError(null);
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

    const handleUseCurrentLocation = () => {
        setIsLocating(true);
        setError(null);
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
                fetchPlaceNameForCoords(latitude, longitude);
            },
            (geoError) => {
                console.error("Geolocation Error:", geoError);
                let message = 'Could not get current location.';
                setError(message);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };


    const uploadProfileImage = async (fileToUpload) => {
        setIsUploadingImage(true); 
        setError(null); 

        const formData = new FormData();
        formData.append('image', fileToUpload); 

        const token = localStorage.getItem('authToken');
        console.log("Token retrieved for image upload: ", token);
        if (!token) {
            throw new Error("Authentication token not found. Please log in again.");
        }
         try {
            console.log("CookProfile: Attempting to upload image via fetchApi...");
            const responseData = await fetchApi('/api/users/me/profile/picture', {
                method: 'POST',
                body: formData,
            });
            console.log("CookProfile: Image upload successful through fetchApi:", responseData);
            return responseData;
        } catch (uploadError) {
            console.error("CookProfile: Image upload failed in uploadProfileImage:", uploadError);
            throw uploadError; 
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage("Data saved succesfully!");
        const token = localStorage.getItem('authToken');
        console.log("CookProfile handleSubmit - Token from localStorage:", token);
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
             let imageUploadMessage = '';
            if (profileImageFile) {
                console.log("Profile image file selected, attempting upload...");
                const imageResponse = await uploadProfileImage(profileImageFile); 
                imageUploadMessage = imageResponse?.message || "Image uploaded."; 
                console.log("Image upload step completed (or skipped).");
                setProfileImageFile(null); 
            } else {
                console.log("No new profile image selected.");
            }
            const profileData = {
                cookname: name, 
                phone,
                expertise: expertiseList,
                availabilityStatus: availability,
                latitude,
                longitude,
                chargesPerMeal: chargesPerMeal ? parseFloat(chargesPerMeal) : null
            };
            console.log("Submitting profile data:", profileData);

            const responseData = await fetchApi('/api/users/me/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData),
            });
             let finalSuccessMessage = responseData?.message || "Cook Profile details saved!";
            if (imageUploadMessage && profileImageFile) { 
                finalSuccessMessage = `${imageUploadMessage} Profile details saved!`;
            }
            setSuccessMessage(responseData?.message || "Cook Profile saved successfully!");

            setTimeout(() => {
                navigate('/cook-dashboard');
            }, 2000);

        } catch (err) {
            console.error("Profile save error:", err);
            setError(err.message || "Failed to save profile.");
            setSuccessMessage(null);
        }
        finally { setIsLoading(false); }
    };
    if (isFetchingProfile) {
        return <div className="profile-loading-message">Loading your profile...</div>;
    }

    return (
        < div className="cook-profile-setup-container">
            <h2>{name || existingProfilePictureUrl ? 'Edit Your Cook Profile' : 'Set Up Your Cook Profile'}</h2>

            {error && <p className="error-message">{error}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="profile-form">

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
                            style={{ display: 'none' }} 
                            onChange={handleImageChange}
                            disabled={isLoading}
                        />
                        <button type="button" onClick={() => document.getElementById('profileImage').click()} disabled={isLoading}>
                            Choose Image
                        </button>
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


                <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        placeholder="(optional)"
                    />
                </div>

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
                            type="button"
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
                                    × 
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            <div className="form-group">
                <label htmlFor="chargesPerMeal">Charges per Meal (₹)</label>
                <input
                    type="number"
                    id="chargesPerMeal"
                    value={chargesPerMeal}
                    onChange={(e) => setChargesPerMeal(e.target.value)}
                    placeholder="e.g., 250"
                    min="0" 
                    step="any" 
                    disabled={isLoading}
                />
            </div>

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

                <div className="form-group form-group-location">
                    <label>Your Location</label>
                     <p className="location-info">
                        {isLocating ? (
                            "Getting current location..."
                        ) : detectedPlaceName && !detectedPlaceName.toLowerCase().includes("error") && !detectedPlaceName.toLowerCase().includes("could not determine") ? (
                            <span className="detected-place-name">Current Area: {detectedPlaceName}</span>
                        ) : latitude !== null && longitude !== null ? (
                            `Current: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)} (Area name lookup pending or failed)`
                        ) : (
                            "Location not set. Click below to use current location."
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLoading || isLocating}
                        className="location-button"
                    >
                        {isLocating ? 'Getting Location...' : 'Use Current Location'}
                    </button>
                </div>

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