// Auth.js - Authentication Helper
console.log('Auth.js loaded');

// Check if user is logged in on page load
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user || !user.role) {
        // Not logged in - redirect to signin
        console.log('No user found, redirecting to signin');
        window.location.href = 'signin.html';
        return false;
    }
    
    console.log('User authenticated:', user.email, 'Role:', user.role);
    
    // Display user info
    const userEmailEl = document.getElementById('userEmail') || document.getElementById('adminEmail');
    if (userEmailEl) {
        userEmailEl.textContent = `👤 ${user.email}`;
    }
    
    return true;
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('rememberMe');
        window.location.href = 'signin.html';
    }
}

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user || !user.role) {
        window.location.href = 'signin.html';
    } else {
        // Update user display
        const userDisplay = document.getElementById('userEmail') || document.getElementById('adminEmail');
        if (userDisplay) {
            userDisplay.textContent = `👤 ${user.email}`;
        }
    }
});

// Check authorization - ensure user has correct role
function checkRole(requiredRole) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user || user.role !== requiredRole) {
        console.warn('Unauthorized access attempt. Required:', requiredRole, 'Has:', user?.role);
        alert('Unauthorized access!');
        window.location.href = 'signin.html';
        return false;
    }
    
    return true;
}

// Export for use in other files
window.Auth = {
    checkAuth,
    handleLogout,
    checkRole,
    getUser: () => JSON.parse(localStorage.getItem('user') || 'null')
};
