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

export const getVessels = async (params = {}) => {
  try {
    const requestParams = {};
    const search = params.search;
    if (search != null && String(search).trim() !== "") {
      requestParams.search = String(search).trim();
    }
    const page = params.page;
    if (page != null && page >= 1) requestParams.page = page;
    const pageSize = params.page_size;
    requestParams.page_size = (pageSize != null && pageSize > 0) ? pageSize : 80;
    if (params.sort_by != null && String(params.sort_by).trim() !== "") {
      requestParams.sort_by = String(params.sort_by).trim();
    }
    if (params.sort_order != null && String(params.sort_order).trim() !== "") {
      requestParams.sort_order = String(params.sort_order).trim();
    }

    const response = await axios.get('/api/vessels', { params: requestParams });
    const data = response.data || response;

    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch vessels");
    }

    const vesselsList = Array.isArray(data.vessels) ? data.vessels : [];

    if (data.status === "success") {
      return {
        vessels: vesselsList,
        count: data.count ?? vesselsList.length,
        total_count: data.total_count ?? vesselsList.length,
        page: data.page ?? 1,
        page_size: data.page_size ?? 80,
        total_pages: data.total_pages ?? 1,
        has_next: data.has_next ?? false,
        has_previous: data.has_previous ?? false,
        success: true,
        message: data.message || 'Vessels retrieved successfully',
      };
    }

    return {
      vessels: vesselsList,
      count: vesselsList.length,
      total_count: vesselsList.length,
      page: 1,
      page_size: 80,
      total_pages: 1,
      has_next: false,
      has_previous: false,
      success: true,
      message: 'Vessels retrieved successfully',
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single vessel by ID (GET /api/vessels/:id)
 * Use this for edit forms to load the current vessel instead of filtering from the list.
 * @param {number|string} vesselId - The vessel ID
 * @returns {Promise<Object>} - The vessel data { id, name, ... }
 */
export const getVesselById = async (vesselId) => {
  try {
    const id = vesselId == null || vesselId === "" ? null : String(vesselId).trim();
    if (!id) return null;
    const response = await axios.get(`/api/vessels/${id}`);
    const data = response.data || response;
    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch vessel");
    }
    const vessel = data.vessel ?? data;
    return vessel && typeof vessel === "object" ? vessel : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single vessel by ID (POST /api/vessel - legacy)
 * @param {number} vesselId - The vessel ID
 * @returns {Promise<Object>} - The vessel data
 */
export const getVessel = async (vesselId) => {
  try {
    const response = await axios.post('/api/vessel', {
      vessel_id: vesselId,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get vessel types for dropdowns
 * @returns {Promise<Array>} - List of vessel types
 */
export const getVesselTypes = async () => {
  try {
    const response = await axios.get('/api/vessels/type');

    // Be flexible with possible response shapes
    const data = response.data;
    const types =
      data.vessel_types ||
      data;

    return Array.isArray(types) ? types : [];
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
      imo: vesselData.imo || "",
      vessel_type: vesselData.vessel_type || "",
      // Ensure status is always sent; default to "active" if missing
      status: vesselData.status || "active",
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
 * @param {Object} [originalVesselData] - The original vessel data for comparison (optional)
 * @param {number} vesselData.current_user - The current user ID
 * @param {string} vesselData.name - The vessel name
 * @param {number} vesselData.client_id - The client ID
 * @param {Array} [vesselData.attachments] - Optional attachments
 * @returns {Promise<Object>} - The API response
 */
export const updateVessel = async (idOrData, maybeData, originalVesselData) => {
  try {
    // Support both signatures: (id, data) or (data with vessel_id)
    const vesselId = typeof idOrData === 'object' ? idOrData?.vessel_id : idOrData;
    const vesselData = typeof idOrData === 'object' ? idOrData : (maybeData || {});

    // Helper function to normalize values for comparison (treat null, undefined, empty string as equivalent)
    const normalizeValue = (value) => {
      if (value === null || value === undefined || value === "") return "";
      // Convert to string for consistent comparison (handles number/string differences)
      return String(value);
    };

    // Helper function to check if a value has changed
    const hasChanged = (newVal, oldVal) => {
      return normalizeValue(newVal) !== normalizeValue(oldVal);
    };

    // Helper function to check if attachments have changed
    const attachmentsChanged = (newAttachments, oldAttachments) => {
      // If both are empty/null/undefined, no change
      if ((!newAttachments || newAttachments.length === 0) && (!oldAttachments || oldAttachments.length === 0)) {
        return false;
      }

      // If lengths differ, changed
      if (!newAttachments || !oldAttachments || newAttachments.length !== oldAttachments.length) {
        return true;
      }

      // Check if any attachment is new (doesn't have an id, meaning it's a new file upload)
      const hasNewAttachments = newAttachments.some(att => !att.id);
      return hasNewAttachments;
    };

    // Start with required fields
    const payload = {
      vessel_id: vesselId,
      current_user: getCurrentUserId(),
    };

    // Only include fields that have changed (if originalVesselData is provided)
    if (originalVesselData) {
      // Check and add changed fields
      if (hasChanged(vesselData.name, originalVesselData.name)) {
        payload.name = vesselData.name;
      }

      if (hasChanged(vesselData.client_id, originalVesselData.client_id)) {
        payload.client_id = vesselData.client_id;
      }

      if (hasChanged(vesselData.imo, originalVesselData.imo)) {
        payload.imo = vesselData.imo || "";
      }

      if (hasChanged(vesselData.vessel_type, originalVesselData.vessel_type)) {
        payload.vessel_type = vesselData.vessel_type || "";
      }

      if (hasChanged(vesselData.status, originalVesselData.status)) {
        payload.status = vesselData.status || "active";
      }

      // Check if attachments have changed (new files added)
      if (attachmentsChanged(vesselData.attachments, originalVesselData.attachments)) {
        // Only send new attachments (files without id)
        const newAttachments = (vesselData.attachments || []).filter(att => !att.id);
        if (newAttachments.length > 0) {
          payload.attachments = newAttachments;
        }
      }
    } else {
      // If no original data provided, send all fields (backward compatibility)
      payload.name = vesselData.name;
      payload.client_id = vesselData.client_id;
      payload.imo = vesselData.imo || "";
      payload.vessel_type = vesselData.vessel_type || "";
      payload.status = vesselData.status || "active";

      // Add attachments if provided
      if (vesselData.attachments && vesselData.attachments.length > 0) {
        payload.attachments = vesselData.attachments;
      }
    }

    // Always include attachment_to_delete if provided (array of IDs)
    if (vesselData.attachment_to_delete && vesselData.attachment_to_delete.length > 0) {
      payload.attachment_to_delete = vesselData.attachment_to_delete;
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
  getVessel,
  getVesselById,
  getVesselTypes,
  createVessel,
  updateVessel,
  deleteVessel,
};

export default vessels;
