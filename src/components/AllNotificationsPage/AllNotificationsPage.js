import React from 'react';
import './AllNotificationsPage.css'; 

function AllNotificationsPage({ notifications = [], onMarkAsRead, onMarkAllAsRead }) {

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            onMarkAsRead(notification.clientSideId);
        }
        // Potentially navigate to a relevant page if notification has a link/type
        // For example: if (notification.type === "BOOKING_ACCEPTED" && notification.bookingId) {
        //   navigate(`/booking-details/${notification.bookingId}`);
        // }
        console.log("Clicked notification:", notification);
    };

    const unreadNotificationsExist = notifications.some(n => !n.isRead);

    return (
        <div className="all-notifications-container">
            <div className="all-notifications-header">
                <h1>All Notifications</h1>
                {notifications.length > 0 && unreadNotificationsExist && (
                    <button 
                        onClick={onMarkAllAsRead} 
                        className="mark-all-read-button"
                    >
                        Mark All as Read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <p className="no-notifications-message">You have no notifications.</p>
            ) : (
                <ul className="notifications-list">
                    {notifications.map(notif => (
                        <li
                            key={notif.clientSideId}
                            className={`notification-list-item ${!notif.isRead ? 'unread' : 'read'}`}
                            onClick={() => handleNotificationClick(notif)}
                            role="button" // Makes it clear it's interactive
                            tabIndex={0} // For accessibility
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNotificationClick(notif)}
                        >
                            <div className="notification-content">
                                <p className="notification-message-full">{notif.message}</p>
                                <span className="notification-meta">
                                    Received: {new Date(notif.timestamp).toLocaleString()}
                                    {notif.type && <span className="notification-type">Type: {notif.type}</span>}
                                </span>
                            </div>
                            {!notif.isRead && <div className="unread-indicator" title="Unread"></div>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default AllNotificationsPage;