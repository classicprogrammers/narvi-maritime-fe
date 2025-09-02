import api from "./axios";

const uomAPI = {
  // Get all UOM
  getUOM: async () => {
    try {
      const response = await api.get("/api/uom");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch UOM:", error);
      throw error;
    }
  },

  // Get UOM categories
  getUOMCategories: async () => {
    try {
      const response = await api.get("/api/uom/category");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch UOM categories:", error);
      throw error;
    }
  },

  // Create UOM category
  createUOMCategory: async (categoryData) => {
    try {
      const response = await api.post("/api/uom/category/create", categoryData);
      return response.data;
    } catch (error) {
      console.error("Error creating UOM category:", error);
      throw error;
    }
  },

  // Update UOM category
  updateUOMCategory: async (id, categoryData) => {
    try {
      const response = await api.post("/api/uom/category/update", { category_id: id, ...categoryData });
      return response.data;
    } catch (error) {
      console.error("Error updating UOM category:", error);
      throw error;
    }
  },

  // Delete UOM category
  deleteUOMCategory: async (id) => {
    try {
      const response = await api.post("/api/uom/category/delete", { category_id: id });
      return response.data;
    } catch (error) {
      console.error("Error deleting UOM category:", error);
      throw error;
    }
  },

  // Get UOM by ID
  getUOMById: async (id) => {
    try {
      const response = await api.get(`/api/uom/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching UOM by ID:", error);
      throw error;
    }
  },

  // Create new UOM
  createUOM: async (uomData) => {
    try {
      const response = await api.post("/api/uom/create", uomData);
      return response.data;
    } catch (error) {
      console.error("Error creating UOM:", error);
      throw error;
    }
  },

  // Update UOM
  updateUOM: async (id, uomData) => {
    try {
      const response = await api.post("/api/uom/update", { uom_id: id, ...uomData });
      return response.data;
    } catch (error) {
      console.error("Error updating UOM:", error);
      throw error;
    }
  },

  // Delete UOM
  deleteUOM: async (id) => {
    try {
      const response = await api.post("/api/uom/delete", { uom_id: id });
      return response.data;
    } catch (error) {
      console.error("Error deleting UOM:", error);
      throw error;
    }
  },
};

export default uomAPI;
