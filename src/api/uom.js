import api from "./axios";

// UOM (Unit of Measurement) API
export const uomAPI = {
  getUOM: async () => {
    try {
      const response = await api.get("/api/uom");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch UOM:", error);
      throw error;
    }
  },
};

export default uomAPI;
