import api from "./axios";

const currenciesAPI = {
  // Get all currencies
  getCurrencies: async () => {
    try {
      const response = await api.get("/api/currencies");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch currencies:", error);
      throw error;
    }
  },

  // Get currency by ID
  getCurrencyById: async (id) => {
    try {
      const response = await api.get(`/api/currencies/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching currency by ID:", error);
      throw error;
    }
  },

  // Create new currency
  createCurrency: async (currencyData) => {
    try {
      const response = await api.post("/api/currency/create", currencyData);
      return response.data;
    } catch (error) {
      console.error("Error creating currency:", error);
      throw error;
    }
  },

  // Update currency
  updateCurrency: async (id, currencyData) => {
    try {
      const response = await api.post("/api/currency/update", { currency_id: id, ...currencyData });
      return response.data;
    } catch (error) {
      console.error("Error updating currency:", error);
      throw error;
    }
  },

  // Delete currency
  deleteCurrency: async (id) => {
    try {
      const response = await api.post("/api/currency/delete", { currency_id: id });
      return response.data;
    } catch (error) {
      console.error("Error deleting currency:", error);
      throw error;
    }
  },
};

export default currenciesAPI;
