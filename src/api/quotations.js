import api from './axios';

// Get all quotations
export const getQuotations = async () => {
  try {
    const response = await api.get('/api/quotations');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get quotation by ID
export const getQuotationById = async (id) => {
  try {
    const response = await api.get(`/api/quotations/${id}`);
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
