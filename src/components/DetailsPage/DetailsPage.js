import React, { useState, useEffect, useRef,useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingFormModal from '../BookingFormModal/BookingFormModal.js';
import CookCard from '../CookCard/CookCard.js';
import { triggerSessionExpiredLogout } from '../../utils/authUtils';
import './DetailsPage.css';

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


function DetailsPage({ token }) { 
    const [location, setLocation] = useState(null); // { latitude: number, longitude: number }
    const [locationName, setLocationName] = useState("Determining your location area...");
    const [locationError, setLocationError] = useState(null);
    const [cooks, setCooks] = useState([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [isLoadingCooks, setIsLoadingCooks] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [radius, setRadius] = useState(4);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authToken,setAuthToken] = useState(null);
    const [userInfo,setUserInfo] = useState(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedCookForBooking, setSelectedCookForBooking] = useState(null);
    const [bookingError, setBookingError] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const scrollContainerRef = useRef(null);
    const [showPrevArrow, setShowPrevArrow] = useState(false);
    const [showNextArrow, setShowNextArrow] = useState(false);
    const navigate = useNavigate();

    
    const checkScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setShowPrevArrow(scrollLeft > 5);
            setShowNextArrow(scrollWidth - clientWidth - scrollLeft > 5);
        } else {
            setShowPrevArrow(false);
            setShowNextArrow(false);
        }
    }, []);

    useEffect(() => {
        checkScroll(); // Initial check
        
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll); // Check on scroll events
        }
        window.addEventListener('resize', checkScroll); // Check on window resize

        return () => {
            if (container) {
                container.removeEventListener('scroll', checkScroll);
            }
            window.removeEventListener('resize', checkScroll);
        };
    }, [cooks, checkScroll]);

    useEffect(() =>{
      const storedToken = localStorage.getItem('authToken');
      const storedUsername = localStorage.getItem('username');
      if(storedToken ){
        setAuthToken(storedToken); 
        setUserInfo({username: storedUsername || 'User'});
        setIsAuthenticated(true);
      } 
    }, []);
    useEffect(() => { 
        setIsLoadingLocation(true);
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            setIsLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                console.log("Location acquired:", position);
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                try {
                    // Call your backend for reverse geocoding
                    console.log(`Requesting reverse geocode from backend for: lat=${coords.latitude}, lon=${coords.longitude}`);
                    const geoData = await fetchApi(`/api/location/reverse-geocode?lat=${coords.latitude}&lon=${coords.longitude}`);
                    
                    if (geoData && geoData.displayName && geoData.displayName !== "Area name not found"  && geoData.displayName.trim() !== "") {
                        setLocationName(geoData.displayName);
                        console.log("Backend reverse geocode success:", geoData.displayName);
                    } else {
                        // Fallback if backend couldn't get a good name or returns empty
                        setLocationName(`Lat: ${coords.latitude.toFixed(2)}, Lon: ${coords.longitude.toFixed(2)}`);
                        console.warn("Backend reverse geocode returned no specific name or an error placeholder. Displaying coords.");
                    }
                } catch (geoError) {
                    console.error("Error calling backend for reverse geocoding:", geoError);
                    setLocationName(`Lat: ${coords.latitude.toFixed(2)}, Lon: ${coords.longitude.toFixed(2)} (name lookup failed)`);
                } finally {
                    setIsLoadingLocation(false); // Location process (coords + name) is complete
                }
            },
            (error) => {
                console.error("Error getting location:", error);
                let message = 'Could not get your location.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location permission denied. Please enable location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        message = 'The request to get user location timed out.';
                        break;
                    default:
                        message = 'An unknown error occurred while getting location.';
                }
                setLocationError(message);
                setLocationName("");
                setIsLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Options
        );
    }, []); 

    // 2. Fetch Cooks when location or radius changes
    useEffect(() => {
        if (location) {
            const fetchCooks = async () => {
                setIsLoadingCooks(true);
                setFetchError(null);
                setCooks([]); 
                const backendUrl = `/api/users/nearby?lat=${location.latitude}&lon=${location.longitude}&radius=${radius}`;
                console.log(`Fetching cooks from: ${backendUrl}`);

                try {
                    const data = await fetchApi(backendUrl);
                    console.log("Cooks received:", data);
                    setCooks(data || []); 
                } catch (error) {
                    console.error("Failed to fetch cooks:", error);
                    setFetchError(error.message || 'Could not fetch cooks.');
                } finally {
                    setIsLoadingCooks(false);
                }
            };

            fetchCooks();
        }
    }, [location, radius]); 

    const handleRadiusChange = (event) => {
        setRadius(Number(event.target.value));
    };
    const handleOpenBookingModal = (cook) => {
        setSelectedCookForBooking(cook);
        setIsBookingModalOpen(true);
        setBookingError(null); 
        setBookingSuccess(null); 
    };

    const handleCloseBookingModal = () => {
        setIsBookingModalOpen(false);
        setSelectedCookForBooking(null);
    };

    const handleBookingSubmit = async (bookingFormData) => {
        if (!selectedCookForBooking) return;
        setBookingError(null);
        setBookingSuccess(null);
        setIsLoadingCooks(true); 

        const payload = {
            cookId: selectedCookForBooking.id,
            customerName: bookingFormData.customerName,
            customerAddress: bookingFormData.customerAddress,
            mealPreference: bookingFormData.mealPreference,
            requestedDateTime: bookingFormData.requestedDateTime || null,
        };

        try {
            console.log("Submitting booking:", payload);
            const responseData = await fetchApi(`/api/bookings`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            console.log("Booking successful:", responseData);
            setBookingSuccess("Booking request sent successfully! The cook will be notified.");
            handleCloseBookingModal(); 
        } catch (error) {
            console.error("Booking submission failed:", error);
            setBookingError(error.message || "Failed to send booking request.");
        } finally {
            setIsLoadingCooks(false);
        }
    };


    const handleSelectCook = (cook) => {
        console.log("Selected cook:", cook);
        // TODO: Implement Step 5 & 6
        // Navigate to a CookProfile page or open a Booking Modal
        alert(`Implement booking flow for cook: ${cook.username || cook.id}`);
    };


    // --- Rendering Logic ---
    if (isLoadingLocation) {
        return <div className="status-message">Getting your location... Please ensure location services are enabled.</div>;
    }

    if (locationError) {
        return <div className="error-message">Error: {locationError}</div>;
    }

    if (!location && !isLoadingLocation) {
        return <div className="status-message">Could not determine location.</div>;
    }
   const scrollLeft = () => {
        if (scrollContainerRef.current) {
            const cardWidth = 280;
            const gap = 20;
            scrollContainerRef.current.scrollBy({ left: -(cardWidth + gap), behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            const cardWidth = 280;
            const gap = 20;
            scrollContainerRef.current.scrollBy({ left: (cardWidth + gap), behavior: 'smooth' });
        }
    };

    return (
<div className="details-page-container">
            {/* Header is now global, no nav needed here */}
            <div className="details-content">
                <h2 className="page-title">Cooks Near You</h2>
                <p className="location-info">
                   {isLoadingLocation ? 
                        "Determining your location..." : 
                        locationError ? 
                        <span className="error-text">{locationError}</span> : 
                        (locationName && locationName !== "Determining your location area..." ? // Check if we have a meaningful name
                            <>Showing cooks near: <strong>{locationName}</strong></> :
                            "Could not determine area name. Using coordinates." // Fallback if name is still placeholder
                        )
                    }
                </p>

<div className="radius-slider-container">
                    <label htmlFor="radius-slider" className="radius-label">Search Radius: </label>
                    <input 
                        type="range" 
                        id="radius-slider"
                        min="1" max="50" step="1"
                        value={radius} 
                        onChange={handleRadiusChange}
                        disabled={isLoadingCooks || isLoadingLocation} // Disable if location or cooks are loading
                        className="radius-slider"
                    />
                    <span className="radius-value-display">{radius} km</span>
                </div>
                {bookingError && <p className="error-message booking-status-message">{bookingError}</p>}
                {bookingSuccess && <p className="success-message booking-status-message">{bookingSuccess}</p>}

                {isLoadingCooks && <p className="status-message">Finding cooks...</p>}
                {fetchError && <p className="error-message centered-message">Error fetching cooks: {fetchError}</p>}

                {!isLoadingCooks && !fetchError && (
                    <>
                        {cooks.length > 0 ? (
                            <div className="cooks-carousel-wrapper">
                                {showPrevArrow && (
                                <button onClick={scrollLeft} className="carousel-arrow prev-arrow" aria-label="Previous cooks">
                                    ← 
                                </button>
                                )}
                                <div className="cooks-list-carousel" ref={scrollContainerRef}> 
                                    {cooks.map((cook) => (
                                        <div className="carousel-item" key={cook.id}> 
                                            <CookCard
                                                cook={cook}
                                                onBook={() => handleOpenBookingModal(cook)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {showNextArrow && (
                                <button onClick={scrollRight} className="carousel-arrow next-arrow" aria-label="Next cooks">
                                     →
                                </button>
                                )}
                            </div>
                        ) : (
                            <p className="no-cooks-message">No cooks found within {radius} km. Try increasing the radius.</p>
                        )}
                    </>
                )}
            </div>

            {isBookingModalOpen && selectedCookForBooking && (
                <BookingFormModal
                    cookName={selectedCookForBooking.cookname || selectedCookForBooking.username}
                    onClose={handleCloseBookingModal}
                    onSubmit={handleBookingSubmit}
                />
            )}
        </div>
    );
}

export default DetailsPage;