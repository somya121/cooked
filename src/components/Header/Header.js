import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../../shared/logo.png';



function Header({ isAuthenticated, userInfo, unreadBookingNotificationCount = 0, onMarkNotificationsAsRead, onLogout, onNavigate: navigateProp }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        if (!event.target.closest('.profile-button-header')) {
          setShowProfileDropdown(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownRef]);

  const handleBellClick = () => {
    setShowDropdown(prev => !prev);
    if (!showDropdown && unreadCount > 0) {
      onMarkNotificationsAsRead();
    }
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Check if the click was on the bell button itself to prevent immediate closing
        if (!event.target.closest('.notification-button')) {
          setShowDropdown(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);
  const handleLogoClick = (event) => {
    event.preventDefault(); // Prevent default Link behavior if we navigate manually
    setShowDropdown(false); // Close dropdown if open

    if (isAuthenticated && userInfo) {
      if (userInfo.roles?.includes("ROLE_COOK")) {
        if (userInfo.status === "PENDING_COOK_PROFILE") {
          navigate('/cook-profile-setup'); // Cook needs to complete profile first
        } else {
          navigate('/cook-dashboard'); // Authenticated cook goes to their dashboard
        }
      } else {
        navigate('/details'); // Authenticated standard user goes to details/find cooks page
      }
    } else {
      navigate('/home'); // Not authenticated, go to home page
    }
  };
  const handleMyBookingsClick = () => {
    if (unreadBookingNotificationCount > 0) {
      onMarkNotificationsAsRead(); // Mark as read when clicked
    }
    navigateProp('/my-bookings');
  };
  const isCook = userInfo?.roles?.includes("ROLE_COOK");
  const isPendingCookProfile = userInfo?.status === "PENDING_COOK_PROFILE";

  return (
    <header className="app-header">
      <div className="header-logo-container">
        <Link to="/home" onClick={handleLogoClick}>
          <img src={logo} alt="Cooked App Logo" className="header-logo" />
        </Link>
      </div>
      <nav className="header-nav">
        {isAuthenticated && userInfo ? (
          <>
            {userInfo.roles?.includes("ROLE_COOK") ? (
              <>
                {userInfo.status === "PENDING_COOK_PROFILE" ? (
                  <button onClick={() => navigateProp('/cook-profile-setup')} className="nav-button-header">
                    Complete Profile
                  </button>
                ) : (
                  <button onClick={() => navigateProp('/cook-dashboard')} className="nav-button-header">
                    Cook Dashboard
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={() => navigateProp('/details')} className="nav-button-header">
                  Find Cooks
                </button>
                <div className="nav-button-container"> {/* Wrapper for button and dot */}
                  <button
                    onClick={handleMyBookingsClick}
                    className="nav-button-header my-bookings-button"
                  >
                    My Bookings
                  </button>
                  {unreadBookingNotificationCount > 0 && (
                    <span className="notification-dot-mybookings"></span>
                  )}
                </div>
              </>
            )}
            {isCook && !isPendingCookProfile && (
              <div className="profile-area-cook" ref={profileDropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(prev => !prev)}
                  className="profile-button-header nav-button-header" // Reuse nav-button style
                >
                  My Profile {/* Or an icon */}
                </button>
                {showProfileDropdown && (
                  <div className="profile-dropdown-cook">
                    <div className="profile-dropdown-item">
                      <strong>Avg. Rating:</strong>
                      {userInfo.averageRating !== null && userInfo.averageRating > 0 && userInfo.numberOfRatings > 0
                        ? ` ${userInfo.averageRating.toFixed(1)} (${userInfo.numberOfRatings} ratings)`
                        : userInfo.numberOfRatings === 0 ? " No ratings yet" : " N/A"}
                    </div>
                    {/* Link to edit profile could also go here */}
                    <button
                      onClick={() => { navigateProp('/cook-profile-setup'); setShowProfileDropdown(false); }}
                      className="profile-dropdown-link"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => { onLogout(); setShowProfileDropdown(false); setShowDropdown(false); }}
                      className="profile-dropdown-link logout-action"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Logout button for non-cooks or if profile dropdown is not used */}
            {(!isCook ) && (
              <button onClick={() => { onLogout(); setShowDropdown(false); }} className="nav-button-header logout-button">
                Logout
              </button>
            )}
          </>
        ) : (
          <>
            {/* Links for non-authenticated users (e.g., on /home page) can go here if Header is used there too */}
            {/* Or these are handled by specific pages like Home.js */}
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;