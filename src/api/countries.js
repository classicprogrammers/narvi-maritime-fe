import api from "./axios";

const countriesAPI = {
  // Get all countries
  getCountries: async () => {
    try {
      const response = await api.get("/api/countries");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch countries:", error);
      throw error;
    }
  },

  // Get country by ID
  getCountryById: async (id) => {
    try {
      const response = await api.get(`/api/countries/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching country by ID:", error);
      throw error;
    }
  },

  // Create new country
  createCountry: async (countryData) => {
    try {
      const response = await api.post("/api/countries/create", countryData);
      return response.data;
    } catch (error) {
      console.error("Error creating country:", error);
      throw error;
    }
  },

  // Update country
  updateCountry: async (id, countryData) => {
    try {
      const response = await api.post("/api/countries/update", { country_id: id, ...countryData });
      return response.data;
    } catch (error) {
      console.error("Error updating country:", error);
      throw error;
    }
  },

  // Delete country
  deleteCountry: async (id) => {
    try {
      const response = await api.post("/api/countries/delete", { country_id: id });
      return response.data;
    } catch (error) {
      console.error("Error deleting country:", error);
      throw error;
    }
  },
};

export default countriesAPI;
