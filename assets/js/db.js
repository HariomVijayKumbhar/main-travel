/**
 * travelAgencyDB - API Client for SQL backend storage
 */
const DB = {
    baseUrl: '/api',

    /**
     * Helper to get common headers including auth token
     */
    getHeaders: function() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add Supabase auth token if user is logged in
        const sessionStr = localStorage.getItem("supabaseSession");
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                if (session && session.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
            } catch (parseError) {
                console.error("Failed to parse session:", parseError);
                // Continue without auth header if session parsing fails
            }
        }
        
        return headers;
    },

    init: function() {
        console.log("SQL Database client initialized");
        return Promise.resolve();
    },

    /**
     * Add a booking to the SQL database (Authenticated)
     * @param {Object} booking 
     */
    addBooking: function(booking) {
        return fetch(`${this.baseUrl}/bookings`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(booking)
        }).then(response => {
            if (response.status === 401) throw new Error('Unauthorized: Please login again');
            if (!response.ok) return response.json().then(err => { throw new Error(err.error || 'Failed to save booking'); });
            return response.json();
        });
    },

    /**
     * Get all bookings for the current user (Authenticated)
     */
    getAllBookings: function() {
        return fetch(`${this.baseUrl}/bookings`, {
            headers: this.getHeaders()
        })
            .then(response => {
                if (response.status === 401) throw new Error('Unauthorized: Please login again');
                if (!response.ok) throw new Error('Failed to fetch bookings');
                return response.json();
            });
    },

    /**
     * Get bookings by user email (Authenticated & Policy Enforced)
     * @param {string} email 
     */
    getBookingsByEmail: function(email) {
        // The backend now enforces user_email = authenticated user, so the query param is less critical
        // but it's kept for API compatibility.
        return fetch(`${this.baseUrl}/bookings`, {
            headers: this.getHeaders()
        })
            .then(response => {
                if (response.status === 401) throw new Error('Unauthorized: Please login again');
                if (!response.ok) throw new Error('Failed to fetch user bookings');
                return response.json();
            });
    }
};
