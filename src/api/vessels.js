import api from "./axios";

const vesselsAPI = {
  // Get all vessels
  getVessels: async () => {
    try {
      const response = await api.get("/api/vessels");
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
      const response = await api.post("/api/vessel/create", vesselData);
      return response.data;
    } catch (error) {
      console.error("Error creating vessel:", error);
      throw error;
    }
  },

  // Update vessel
  updateVessel: async (id, vesselData) => {
    try {
      const response = await api.post("/api/vessel/update", { vessel_id: id, ...vesselData });
      return response.data;
    } catch (error) {
      console.error("Error updating vessel:", error);
      throw error;
    }
  },

  // Delete vessel
  deleteVessel: async (id) => {
    try {
      const response = await api.post("/api/vessel/delete", { vessel_id: id });
      return response.data;
    } catch (error) {
      console.error("Error deleting vessel:", error);
      throw error;
    }
  },
};

export default vesselsAPI;
