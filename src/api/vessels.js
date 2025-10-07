import api from "./axios";

const vesselsAPI = {
  // Get all vessels
  getVessels: async () => {
    try {
      const response = await api.get("/api/vessels");
      
      // Check if response has error status (JSON-RPC format)
      if (response.data.result && response.data.result.status === 'error') {
        throw new Error(response.data.result.message || 'Failed to fetch vessels');
      }
      
      return response.data;
    } catch (error) {
      console.error("Failed to fetch vessels:", error);
      throw error;
    }
  },

  // Get vessel by ID
  getVesselById: async (id) => {
    try {
      const response = await api.get(`/api/vessels/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching vessel by ID:", error);
      throw error;
    }
  },

  // Create new vessel
  createVessel: async (vesselData) => {
    try {
      // Get user ID from localStorage
      const userData = localStorage.getItem("user");
      let currentUserId = null;

      if (userData) {
        try {
          const user = JSON.parse(userData);
          currentUserId = user.id;
        } catch (parseError) {
          console.warn("Failed to parse user data from localStorage:", parseError);
        }
      }

      // Add current_user to vessel data
      const payload = {
        ...vesselData,
        current_user: currentUserId,
      };

      const response = await api.post("/api/vessel/create", payload);
      
      // Check if response has error status (JSON-RPC format)
      if (response.data.result && response.data.result.status === 'error') {
        throw new Error(response.data.result.message || 'Failed to create vessel');
      }
      
      return response.data;
    } catch (error) {
      console.error("Error creating vessel:", error);
      throw error;
    }
  },

  // Update vessel
  updateVessel: async (id, vesselData) => {
    try {
      // Get user ID from localStorage
      const userData = localStorage.getItem("user");
      let currentUserId = null;

      if (userData) {
        try {
          const user = JSON.parse(userData);
          currentUserId = user.id;
        } catch (parseError) {
          console.warn("Failed to parse user data from localStorage:", parseError);
        }
      }

      // Add vessel_id and current_user to vessel data
      const payload = {
        vessel_id: id,
        ...vesselData,
        current_user: currentUserId,
      };

      const response = await api.post("/api/vessel/update", payload);
      
      // Check if response has error status (JSON-RPC format)
      if (response.data.result && response.data.result.status === 'error') {
        throw new Error(response.data.result.message || 'Failed to update vessel');
      }
      
      return response.data;
    } catch (error) {
      console.error("Error updating vessel:", error);
      throw error;
    }
  },

  // Delete vessel
  deleteVessel: async (id) => {
    try {
      // Get user ID from localStorage
      const userData = localStorage.getItem("user");
      let currentUserId = null;

      if (userData) {
        try {
          const user = JSON.parse(userData);
          currentUserId = user.id;
        } catch (parseError) {
          console.warn("Failed to parse user data from localStorage:", parseError);
        }
      }

      const payload = {
        vessel_id: id,
        current_user: currentUserId,
      };

      const response = await api.post("/api/vessel/delete", payload);
      
      // Check if response has error status (JSON-RPC format)
      if (response.data.result && response.data.result.status === 'error') {
        throw new Error(response.data.result.message || 'Failed to delete vessel');
      }
      
      return response.data;
    } catch (error) {
      console.error("Error deleting vessel:", error);
      throw error;
    }
  },
};

export default vesselsAPI;
