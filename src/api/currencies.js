import api from "./axios";

// Currencies API
export const currenciesAPI = {
  getCurrencies: async () => {
    try {
      const response = await api.get("/api/currencies");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch currencies:", error);
      throw error;
    }
  },
};

export default currenciesAPI;
