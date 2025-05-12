import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


async function fetchApi(url, options = {}) {
    const token = localStorage.getItem('authToken'); 
    const defaultHeaders = {
        'Content-Type': 'application/json',
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
    const [locationError, setLocationError] = useState(null);
    const [cooks, setCooks] = useState([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [isLoadingCooks, setIsLoadingCooks] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [radius, setRadius] = useState(4);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authToken,setAuthToken] = useState(null);
    const [userInfo,setUserInfo] = useState(null);
    const navigate = useNavigate();
    useEffect(() =>{
      const storedToken = localStorage.getItem('authToken');
      const storedUsername = localStorage.getItem('username');
      if(storedToken ){
        setAuthToken(storedToken); 
        setUserInfo({username: storedUsername || 'User'});
        setIsAuthenticated(true);
      } 
    }, []);
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRoles'); 
        setAuthToken(null);
        setUserInfo(null);
        setIsAuthenticated(false);
        navigate('/home'); 
    };
    useEffect(() => { 
        setIsLoadingLocation(true);
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            setIsLoadingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("Location acquired:", position);
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setIsLoadingLocation(false);
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
                setIsLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Options
        );
    }, []); // Run only once on mount

    // 2. Fetch Cooks when location or radius changes
    useEffect(() => {
        if (location) {
            const fetchCooks = async () => {
                setIsLoadingCooks(true);
                setFetchError(null);
                setCooks([]); // Clear previous cooks
                const backendUrl = `http://localhost:8080/api/cooks/nearby?lat=${location.latitude}&lon=${location.longitude}&radius=${radius}`;
                console.log(`Fetching cooks from: ${backendUrl}`);

                try {
                    // Use the helper function
                    const data = await fetchApi(backendUrl);
                    console.log("Cooks received:", data);
                    // Assuming backend returns an array of cooks directly
                    setCooks(data || []); // Handle potential null/undefined response
                } catch (error) {
                    console.error("Failed to fetch cooks:", error);
                    setFetchError(error.message || 'Could not fetch cooks.');
                } finally {
                    setIsLoadingCooks(false);
                }
            };

            fetchCooks();
        }
    }, [location, radius]); // Re-fetch if location or radius changes

    const handleRadiusChange = (event) => {
        setRadius(Number(event.target.value));
    };

    const handleSelectCook = (cook) => {
        console.log("Selected cook:", cook);
        // TODO: Implement Step 5 & 6
        // Navigate to a CookProfile page or open a Booking Modal
        alert(`Implement booking flow for cook: ${cook.username || cook.id}`);
    };


    // --- Rendering Logic ---
    if (isLoadingLocation) {
        return <div>Getting your location... Please ensure location services are enabled.</div>;
    }

    if (locationError) {
        return <div className="error-message">Error: {locationError}</div>;
    }

    if (!location) {
        // Should ideally not happen if no error and not loading, but good fallback
        return <div>Could not determine location.</div>;
    }

    return (
        <div>
                {isAuthenticated && (
      <nav>
        Welcome, {userInfo?.username} !
 {userInfo.roles?.includes("ROLE_COOK") && userInfo.status !== "PENDING_COOK_PROFILE" && (
                        <button onClick={() => navigate('/cook-profile-setup')} className="nav-button">
                            Edit Cook Profile
                        </button>
                    )}
                    {userInfo.roles?.includes("ROLE_COOK") && (
                        <button onClick={() => navigate('/cook-dashboard')} className="nav-button">
                            My Cook Dashboard
                        </button>
                    )}
                     {!userInfo.roles?.includes("ROLE_COOK") && ( // For standard users
                        <button onClick={() => navigate('/details')} className="nav-button">
                            Find Cooks
                        </button>
                    )}
        <button onClick={handleLogout}>Logout</button>
      </nav>
    )}
            <h2>Cooks Near You</h2>
            <p>Your Location: Latitude {location.latitude.toFixed(4)}, Longitude {location.longitude.toFixed(4)}</p>

            {/* 3. Radius Filter */}
            <div>
                <label htmlFor="radius">Search Radius (km): </label>
                <select id="radius" value={radius} onChange={handleRadiusChange} disabled={isLoadingCooks}>
                    <option value={4}>4 km</option>
                    <option value={8}>8 km</option>
                    {/* Add more options if needed */}
                </select>
            </div>

            {/* Loading/Error states for cooks */}
            {isLoadingCooks && <p>Finding cooks...</p>}
            {fetchError && <p className="error-message">Error fetching cooks: {fetchError}</p>}

            {/* 4. Cooks List */}
            {!isLoadingCooks && !fetchError && (
                <div className="cooks-list">
                    {cooks.length > 0 ? (
                        cooks.map((cook) => (
                            // TODO: Create a CookCard component for better structure
                            <div key={cook.id} className="cook-card">
                                <h3>{cook.username || `Cook ID: ${cook.id}`}</h3>
                                {/* Display other relevant cook info from your CookDTO */}
                                {/* e.g., <p>Specialty: {cook.specialty}</p> */}
                                {/* e.g., <p>Distance: {cook.distanceKm.toFixed(1)} km</p> (If backend provides distance) */}
                                <button onClick={() => handleSelectCook(cook)}>
                                    Select Cook
                                </button>
                            </div>
                        ))
                    ) : (
                        <p>No cooks found within {radius} km.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default DetailsPage;