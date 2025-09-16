// Debug utility for authentication issues
export const debugAuth = {
  // Check current authentication state
  checkAuthState: () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    return { token, user };
  },
  
  // Test API call with detailed logging
  testApiCall: async (url, method = 'GET') => {
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("API call failed:", {
          status: response.status,
          statusText: response.statusText,
          data
        });
      }
      
      return { success: response.ok, status: response.status, data };
    } catch (error) {
      console.error("API call error:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Clear auth state
  clearAuth: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    console.log("Auth state cleared");
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
}
