// Enhanced Authentication Guard - Protects main app with session management
// Features: Session timeout, automatic logout, activity monitoring
// All user data persists across page refreshes

(function() {
    'use strict';

    const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

    // Check authentication status and session validity
    function checkAuth() {
        const currentUser = getCurrentUser();
        const sessionData = JSON.parse(localStorage.getItem('ebs_session_data') || '{}');
        
        if (!currentUser) {
            // No user logged in, redirect to auth page
            window.location.href = 'auth.html';
            return false;
        }
        
        // Check if session has expired
        if (sessionData.expiry && Date.now() > sessionData.expiry) {
            performLogout();
            alert('Your session has expired. Please login again.');
            window.location.href = 'auth.html';
            return false;
        }
        
        // User is logged in with valid session, update UI
        displayUserInfo(currentUser);
        startSessionMonitoring();
        return true;
    }
    
    // Monitor user activity to refresh session
    function startSessionMonitoring() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, refreshSession);
        });
        
        // Check session every minute
        setInterval(checkSessionExpiry, 60000);
    }
    
    // Refresh session on user activity
    function refreshSession() {
        const currentUser = getCurrentUser();
        if (currentUser) {
            const sessionData = {
                expiry: Date.now() + SESSION_TIMEOUT,
                lastActivity: new Date().toISOString()
            };
            localStorage.setItem('ebs_session_data', JSON.stringify(sessionData));
        }
    }
    
    // Check if session is about to expire
    function checkSessionExpiry() {
        const sessionData = JSON.parse(localStorage.getItem('ebs_session_data') || '{}');
        if (sessionData.expiry) {
            const timeRemaining = sessionData.expiry - Date.now();
            
            // Warn user 5 minutes before expiry
            if (timeRemaining > 0 && timeRemaining < 5 * 60 * 1000 && timeRemaining > 4 * 60 * 1000) {
                alert('Your session will expire in 5 minutes. Please save your work.');
            }
            
            // Session expired
            if (timeRemaining <= 0) {
                performLogout();
                alert('Your session has expired. Please login again.');
                window.location.href = 'auth.html';
            }
        }
    }
    
    // Perform logout
    function performLogout() {
        localStorage.removeItem('ebs_current_user');
        localStorage.removeItem('ebs_session_data');
        logActivity('User logged out', 'Authentication');
    }

    // Get current user from localStorage
    function getCurrentUser() {
        const user = localStorage.getItem('ebs_current_user');
        return user ? JSON.parse(user) : null;
    }

    // Display user info in header
    function displayUserInfo(user) {
        // Update header with user name if element exists
        const userInfoEl = document.querySelector('.user-info');
        if (userInfoEl) {
            userInfoEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="text-align: right;">
                        <div style="font-weight: 600; font-size: 14px;">${user.name}</div>
                        <div style="font-size: 12px; opacity: 0.8;">${user.role}</div>
                    </div>
                    <button onclick="logout()" style="background: rgba(255, 255, 255, 0.2); color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.3s ease;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            `;
        }
    }

    // Logout function (global scope)
    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            // Remove current user session but keep other data
            localStorage.removeItem('ebs_current_user');
            
            // Log activity
            logActivity('User logged out', 'Authentication');
            
            // Redirect to auth page
            window.location.href = 'auth.html';
        }
    };

    // Log activity
    function logActivity(action, category) {
        const activityLog = JSON.parse(localStorage.getItem('ebs_activity_log') || '[]');
        const currentUser = getCurrentUser();
        
        activityLog.push({
            id: Date.now().toString(),
            action,
            category,
            timestamp: new Date().toISOString(),
            user: currentUser?.name || 'System'
        });
        
        localStorage.setItem('ebs_activity_log', JSON.stringify(activityLog));
    }

    // Run auth check when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }

    // Ensure all data persists across refreshes
    window.addEventListener('beforeunload', function() {
        // Data is already in localStorage, this is just a safety check
        console.log('✅ All data persisted in localStorage');
    });
})();
