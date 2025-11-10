import axios from './axios';

// Helper to read current user id from localStorage
const getCurrentUserId = () => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user?.id ?? null;
  } catch (_e) {
    return null;
  }
};

/**
 * Get all vessels
 * @returns {Promise<Object>} - The API response
 */
export const getVessels = async () => {
  try {
    const response = await axios.get('/api/vessels');
    return {
      success: true,
      result: response.data,
      vessels: response.data.vessels || [],
      message: response.data.message || 'Vessels retrieved successfully',
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new vessel
 * @param {Object} vesselData - The vessel data
 * @param {number} vesselData.current_user - The current user ID
 * @param {string} vesselData.name - The vessel name
 * @param {number} vesselData.client_id - The client ID
 * @param {Array} [vesselData.attachments] - Optional attachments
 * @returns {Promise<Object>} - The API response
 */
export const createVessel = async (vesselData) => {
  try {
    const payload = {
      current_user: getCurrentUserId(),
      name: vesselData.name,
      client_id: vesselData.client_id,
    };

    // Add attachments if provided
    if (vesselData.attachments && vesselData.attachments.length > 0) {
      payload.attachments = vesselData.attachments;
    }

    const response = await axios.post('/api/vessel/create', payload);
    return { result: response.data };
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing vessel
 * @param {number} id - The vessel ID
 * @param {Object} vesselData - The vessel data
 * @param {number} vesselData.current_user - The current user ID
 * @param {string} vesselData.name - The vessel name
 * @param {number} vesselData.client_id - The client ID
 * @param {Array} [vesselData.attachments] - Optional attachments
 * @returns {Promise<Object>} - The API response
 */
export const updateVessel = async (idOrData, maybeData) => {
  try {
    // Support both signatures: (id, data) or (data with vessel_id)
    const vesselId = typeof idOrData === 'object' ? idOrData?.vessel_id : idOrData;
    const vesselData = typeof idOrData === 'object' ? idOrData : (maybeData || {});

    const payload = {
      vessel_id: vesselId,
      current_user: getCurrentUserId(),
      name: vesselData.name,
      client_id: vesselData.client_id,
    };

    // Add attachments if provided
    if (vesselData.attachments && vesselData.attachments.length > 0) {
      payload.attachments = vesselData.attachments;
    }

    const response = await axios.post(`/api/vessel/update`, payload);
    return { result: response.data };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a vessel
 * @param {number} id - The vessel ID
 * @param {number} current_user - The current user ID
 * @returns {Promise<Object>} - The API response
 */
export const deleteVessel = async (id) => {
  try {
    const response = await axios.post(`/api/vessel/delete`, {
      vessel_id: id,
      current_user: getCurrentUserId(),
    });
    return { result: response.data };
  } catch (error) {
    throw error;
  }
};

const vessels = {
  getVessels,
  createVessel,
  updateVessel,
  deleteVessel,
};

export default vessels;
