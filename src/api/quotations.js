import api from './axios';

// Get quotations list (API list mode)
export const getQuotations = async (params = {}) => {
  try {
    const response = await api.get('/api/quotations', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 100,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get quotation by ID (API detail mode)
export const getQuotationById = async (id) => {
  try {
    const response = await api.get('/api/quotations', {
      params: { quotation_id: id },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create new quotation
export const createQuotation = async (quotationData) => {
  try {
    const response = await api.post('/api/quotation/create', quotationData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update quotation
export const updateQuotation = async (quotationData) => {
  try {
    const response = await api.post('/api/quotation/update', quotationData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete quotation
export const deleteQuotation = async (quotationData) => {
  try {
    const response = await api.post('/api/quotation/delete', quotationData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

const quotations = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
};

export default quotations;
