// Utility functions for the advanced web playground

// Debounce function to limit the rate of function execution
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Function to sanitize content for URL hash encoding
function sanitizeContent(state) {
    const json = JSON.stringify(state);
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Function to desanitize content from URL hash
function desanitizeContent(base64) {
    try {
        const safeBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(safeBase64));
    } catch (e) {
        console.error("Failed to parse project from URL hash:", e);
        return null;
    }
}

// Function to generate a unique ID
function generateUniqueId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Function to check if a value is empty
function isEmpty(value) {
    return value === null || value === undefined || value === '';
}