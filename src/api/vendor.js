// Agent API functions (using vendor endpoints for backend compatibility)
import { getApiEndpoint } from "../config/api";
import api from "./axios";

// Import the global modal system
import { showApiModal } from "../components/ApiModal";

// Helper function to handle API errors and show modals
const handleApiError = (error, operation) => {
  console.error(`${operation} failed:`, error);

  let errorMessage = error.message || `Failed to ${operation.toLowerCase()}`;

  // Network errors (CORS, connection refused, etc.)
  if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
    errorMessage =
      "Cannot connect to backend server. Please check if the server is running and CORS is properly configured.";
  }

  // HTTP errors (4xx, 5xx) - Extract detailed error message from response
  if (error.response) {
    const responseData = error.response.data;

    // Check for JSON-RPC error format
    if (responseData && responseData.result && responseData.result.status === 'error') {
      errorMessage = responseData.result.message || errorMessage;
    }
    // Check for direct error message in response
    else if (responseData && responseData.message) {
      errorMessage = responseData.message;
    }
    // Check for error in response data
    else if (responseData && responseData.error) {
      errorMessage = responseData.error;
    }
    // Fallback to status-based message
    else {
      errorMessage = `Backend error (${error.response.status}): ${errorMessage}`;
    }
  }

  // Show error modal
  showApiModal("error", `${operation} Failed`, errorMessage);

  throw new Error(errorMessage);
};

const normalizeUserId = (userId) => {
  if (userId === null || userId === undefined || userId === "") {
    return null;
  }
  const parsed = parseInt(userId, 10);
  return Number.isNaN(parsed) ? userId : parsed;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "approved"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "not approved"].includes(normalized)) {
      return false;
    }
  }
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return Boolean(value);
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const buildAgentPayload = (agentData = {}, userId) => {
  // Children array is already built in the component with correct structure (op, id, etc.)
  // Just use it directly without transformation
  const children = Array.isArray(agentData.children) ? agentData.children : [];

  const approvalValue =
    agentData.narvi_maritime_approved_agent ?? agentData.narvi_approved;

  // Handle parent_id: preserve the value if explicitly set (including null), otherwise default to false
  const parentIdValue =
    agentData.parent_id !== undefined
      ? agentData.parent_id
      : agentData.parentId !== undefined
        ? agentData.parentId
        : agentData.parent !== undefined
          ? agentData.parent
          : false;

  // --- Build CNEE payload in new agent_cnee_ids format ---------------------
  // If caller already passed agent_cnee_ids, keep them as-is.
  let agentCneeIds = Array.isArray(agentData.agent_cnee_ids)
    ? agentData.agent_cnee_ids
    : null;

  if (!agentCneeIds) {
    const cneeTexts = [];

    // Collect non-empty CNEE1–CNEE12 values
    for (let i = 1; i <= 12; i += 1) {
      const key = `cnee${i}`;
      const raw = agentData[key];
      if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
        cneeTexts.push(String(raw).trim());
      }
    }

    // Include legacy free-text CNEE field if present
    if (
      agentData.cnee_text !== null &&
      agentData.cnee_text !== undefined &&
      String(agentData.cnee_text).trim() !== ""
    ) {
      cneeTexts.push(String(agentData.cnee_text).trim());
    }

    // Default CNEE type – backend requires a value; adjust when UI exposes type
    const defaultCneeType = agentData.cnee || "air";

    const normalizedWarnings = normalizeString(agentData.warnings);
    const normalizedApproval = normalizeBoolean(approvalValue, false);

    agentCneeIds = cneeTexts.map((text) => ({
      cnee: defaultCneeType, // e.g. "air" | "cargo" | "ocean_freight"
      cnee_text: text,
      warnings: normalizedWarnings,
      narvi_maritime_approved_agent: normalizedApproval,
    }));
  }

  const payload = {
    current_user:
      agentData.current_user ?? userId ?? agentData.user_id ?? null,
    user_id: agentData.user_id ?? userId ?? agentData.current_user ?? null,
    parent_id: parentIdValue,
    agentsdb_id: normalizeString(agentData.agentsdb_id),
    name: normalizeString(agentData.name),
    agents_address_type: normalizeString(
      agentData.agents_address_type ?? agentData.address_type
    ),
    street: normalizeString(agentData.street),
    street2: normalizeString(agentData.street2),
    // Extra address lines (3–7) so full address is sent for both create & update
    street3: normalizeString(agentData.street3),
    street4: normalizeString(agentData.street4),
    street5: normalizeString(agentData.street5),
    street6: normalizeString(agentData.street6),
    street7: normalizeString(agentData.street7),
    zip: normalizeString(agentData.zip),
    city: normalizeString(agentData.city),
    country_id: normalizeNumber(agentData.country_id),
    reg_no: normalizeString(agentData.reg_no),
    email: normalizeString(agentData.email),
    email2: normalizeString(agentData.email2),
    phone: normalizeString(agentData.phone),
    phone2: normalizeString(agentData.phone2),
    website: normalizeString(agentData.website),
    agents_pic: normalizeString(agentData.agents_pic ?? agentData.pic),
    // Keep legacy warnings / approval for backward compatibility
    warnings: normalizeString(agentData.warnings),
    narvi_maritime_approved_agent: normalizeBoolean(approvalValue, false),
    remarks: normalizeString(agentData.remarks),
    // Commercial fields aligned with customer side
    payment_term: normalizeString(agentData.payment_term),
    type_client: normalizeString(agentData.type_client),
    is_agent: agentData.is_agent ?? true,
    children,
    // NEW CNEE payload structure
    agent_cnee_ids: agentCneeIds,
    // Include attachments if provided
    attachments: Array.isArray(agentData.attachments) && agentData.attachments.length > 0
      ? agentData.attachments
      : undefined,
    attachment_to_delete: Array.isArray(agentData.attachment_to_delete) && agentData.attachment_to_delete.length > 0
      ? agentData.attachment_to_delete
      : undefined,
  };

  return payload;
};

const determineSuccessStatus = (response) => {
  if (!response) return false;
  if (response.result && response.result.status) {
    return response.result.status === "success";
  }
  if (typeof response.status === "string") {
    return response.status.toLowerCase() === "success";
  }
  if (typeof response.success === "boolean") {
    return response.success;
  }
  return false;
};

const withSuccessFlag = (response) => {
  if (!response) return response;
  const success = determineSuccessStatus(response);
  if (typeof response.success === "boolean" && response.success === success) {
    return response;
  }
  return { ...response, success };
};

// Get Countries API
export const getCountriesApi = async () => {
  try {
    const response = await api.get(getApiEndpoint("COUNTRIES"));
    return response.data;
  } catch (error) {
    console.error("Get countries error:", error);
    handleApiError(error, "Get countries");
  }
};

// Register Agent API
export const registerVendorApi = async (agentData) => {
  try {
    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = normalizeUserId(user.id);
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }

    const payload = buildAgentPayload(agentData, userId);

    const response = await api.post(
      getApiEndpoint("VENDOR_REGISTER"),
      payload
    );
    const result = response.data;


    // Check if the JSON-RPC response indicates an error
    if (
      (result.result && result.result.status === "error") ||
      (typeof result.status === "string" && result.status.toLowerCase() === "error") ||
      result.success === false
    ) {
      // Return the error result so the component can extract validation errors
      // Don't throw, let the component handle it based on success flag
      return {
        success: false,
        result: result.result || result,
        error: result?.result?.message || result?.message || "Registration failed",
        ...result, // Include full result for error extraction
      };
    }

    // Check if the response has the expected structure
    if (!result.result || result.result.status !== "success") {
      const success = determineSuccessStatus(result);
      if (!success) {
        // Return error result instead of throwing
        return {
          success: false,
          result: result.result || result,
          error: result?.result?.message || result?.message || "Invalid response from server",
          ...result, // Include full result for error extraction
        };
      }
    }

    return withSuccessFlag(result);
  } catch (error) {
    console.error("Register vendor error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

// Serialize query params: space as %20 (not +), keep @ as literal for email (API supports space and @ as-is)
const serializeVendorParams = (params) =>
  Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => {
      const strVal = typeof v === "number" ? String(v) : String(v).trim();
      if (strVal === "") return null;
      const encoded = encodeURIComponent(strVal);
      const value = k === "email" ? encoded.replace(/%40/g, "@") : encoded;
      return `${encodeURIComponent(k)}=${value}`;
    })
    .filter(Boolean)
    .join("&");

// Get Agents API - filter params + page/page_size for server-side pagination (80 per page)
export const getVendorsApi = async (filterParams = {}) => {
  try {
    const baseUrl = getApiEndpoint("VENDORS");
    const params = {};
    if (filterParams) {
      const nameOrSearch = filterParams.search ?? filterParams.name;
      if (nameOrSearch != null && String(nameOrSearch).trim() !== "")
        params.search = String(nameOrSearch).trim().replace(/\s+/g, " ");
      if (filterParams.agentsdb_id != null && String(filterParams.agentsdb_id).trim() !== "")
        params.agentsdb_id = String(filterParams.agentsdb_id).trim();
      if (filterParams.agent_type != null && String(filterParams.agent_type).trim() !== "")
        params.agent_type = String(filterParams.agent_type).trim();
      const cid = filterParams.country_id;
      if (cid != null && cid !== "" && !Number.isNaN(Number(cid)))
        params.country_id = parseInt(cid, 10);
      const page = filterParams.page;
      if (page != null && page >= 1) params.page = page;
      const pageSize = filterParams.page_size;
      params.page_size = (pageSize != null && pageSize > 0) ? pageSize : 80;
      if (filterParams.sort_by != null && String(filterParams.sort_by).trim() !== "")
        params.sort_by = String(filterParams.sort_by).trim();
      if (filterParams.sort_order != null && String(filterParams.sort_order).trim() !== "")
        params.sort_order = String(filterParams.sort_order).trim();
    } else {
      params.page_size = 80;
    }
    const queryString = serializeVendorParams(params);
    const url = baseUrl + (queryString ? `?${queryString}` : "");
    const response = await api.get(url);
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch agents');
    }

    const responseData = response.data;

    // Check if response has error status (JSON-RPC format)
    if (responseData.result && responseData.result.status === 'error') {
      throw new Error(responseData.result.message || 'Failed to fetch agents');
    }

    // Handle different response formats
    // If response has result wrapper, extract it
    if (responseData.result && responseData.result.status === 'success') {
      return responseData.result;
    }

    // Return direct response if it has the expected structure (status: "success")
    if (responseData.status === "success") {
      return responseData;
    }

    // Fallback for backward compatibility
    if (Array.isArray(responseData)) {
      return responseData;
    }

    if (Array.isArray(responseData.agents)) {
      return responseData;
    }

    if (Array.isArray(responseData.vendors)) {
      return responseData;
    }

    return responseData;
  } catch (error) {
    console.error("Get agents error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

// Get Agent by ID API
export const getVendorByIdApi = async (agentId) => {
  try {
    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }

    // Try different endpoint patterns with user_id
    const endpoints = [
      `/api/agent/get/${agentId}${userId ? `?user_id=${userId}` : ''}`,
      `/api/agent/${agentId}${userId ? `?user_id=${userId}` : ''}`,
      `${getApiEndpoint("VENDORS")}/${agentId}${userId ? `?user_id=${userId}` : ''}`,
      `${getApiEndpoint("VENDORS")}?id=${agentId}${userId ? `&user_id=${userId}` : ''}`,
      `/api/vendor/${agentId}${userId ? `?user_id=${userId}` : ''}`,
    ];

    let response;
    let lastError;

    for (const endpoint of endpoints) {
      try {
        response = await api.get(endpoint);
        break; // If successful, break out of the loop
      } catch (err) {
        lastError = err;
        continue; // Try next endpoint
      }
    }

    if (!response) {
      throw lastError || new Error("All endpoints failed");
    }

    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      const errorMsg = response.data.result.message || 'Failed to fetch agent';
      console.error("API returned error:", errorMsg, response.data);
      throw new Error(errorMsg);
    }

    // Log the response structure for debugging
    console.log("getVendorByIdApi response:", {
      hasResult: !!response.data?.result,
      hasData: !!response.data?.data,
      hasAgent: !!response.data?.agent,
      resultStatus: response.data?.result?.status,
      fullResponse: response.data,
    });

    return response.data;
  } catch (error) {
    console.error("Get agent by ID error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

// Update Agent API
export const updateVendorApi = async (agentId, data) => {
  try {
    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = normalizeUserId(user.id);
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }

    const payload = {
      ...buildAgentPayload(data, userId),
      agent_id: agentId,
      vendor_id: agentId,
      id: agentId,
    };

    const response = await api.post(
      getApiEndpoint("VENDOR_UPDATE"),
      payload
    );
    const result = response.data;


    // Check if the JSON-RPC response indicates an error
    if (
      (result.result && result.result.status === "error") ||
      (typeof result.status === "string" && result.status.toLowerCase() === "error") ||
      result.success === false
    ) {
      // Return the error result so the component can extract validation errors
      // Don't throw, let the component handle it based on success flag
      return {
        success: false,
        result: result.result || result,
        error: result?.result?.message || result?.message || "Update failed",
        ...result, // Include full result for error extraction
      };
    }

    // Check if the response has the expected structure
    if (!result.result || result.result.status !== "success") {
      const success = determineSuccessStatus(result);
      if (!success) {
        // Return error result instead of throwing
        return {
          success: false,
          result: result.result || result,
          error: result?.result?.message || result?.message || "Invalid response from server",
          ...result, // Include full result for error extraction
        };
      }
    }

    console.log("Agent update successful:", result);
    return withSuccessFlag(result);
  } catch (error) {
    console.error("Update agent error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

// Delete Agent API
export const deleteVendorApi = async (agentId) => {
  try {
    if (!agentId) {
      throw new Error("Agent ID is required for deletion");
    }

    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }

    // Add agent_id and user information to the request body
    // Match the backend expectation: agent_id (required) and current_user (optional)
    const payload = {
      id: agentId,
      agent_id: agentId,
      current_user: userId, // Backend expects current_user in payload
      user_id: userId, // Also include user_id for consistency
    };

    // Try agent delete endpoint first (consistent with other agent endpoints)
    // Fallback to vendor delete endpoint for backward compatibility
    let response;
    let endpoint = "/api/agent/delete";

    try {
      response = await api.post(endpoint, payload);
    } catch (err) {
      // If 404, try the fallback endpoint
      if (err.response?.status === 404) {
        endpoint = getApiEndpoint("VENDOR_DELETE");
        response = await api.post(endpoint, payload);
      } else {
        throw err;
      }
    }

    const result = response.data;

    // Check if the JSON-RPC response indicates an error
    if (
      (result.result && result.result.status === "error") ||
      (typeof result.status === "string" && result.status.toLowerCase() === "error") ||
      result.success === false
    ) {
      const message =
        result?.result?.message ||
        result?.message ||
        "Delete failed";
      throw new Error(message);
    }

    // Check if the response has the expected structure
    if (!result.result || result.result.status !== "success") {
      const success = determineSuccessStatus(result);
      if (!success) {
        console.error("Invalid response structure:", result);
        throw new Error(result?.result?.message || result?.message || "Invalid response from server");
      }
    }

    console.log("Agent delete successful:", result);
    return withSuccessFlag(result);
  } catch (error) {
    console.error("Delete agent error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

/**
 * Get agent attachment file for viewing or download.
 * View: GET /api/agents/{agentId}/attachment/{attachmentId}/download
 * Download: GET /api/agents/{agentId}/attachment/{attachmentId}/download?download=true
 * Returns { data: Blob, type, filename }.
 */
export const getAgentAttachmentApi = async (agentId, attachmentId, forceDownload = false) => {
  try {
    const baseUrl = getApiEndpoint("VENDORS");
    const url = `${baseUrl}/${agentId}/attachment/${attachmentId}/download${forceDownload ? "?download=true" : ""}`;
    const response = await api.get(url, {
      responseType: "blob",
    });

    if (response.data instanceof Blob && response.data.type === "application/json") {
      const text = await response.data.text();
      const jsonData = JSON.parse(text);
      if (jsonData.result && jsonData.result.status === "error") {
        throw new Error(jsonData.result.message || "Failed to fetch attachment");
      }
      return jsonData;
    }

    return {
      data: response.data,
      type: response.headers["content-type"] || "application/octet-stream",
      filename:
        response.headers["content-disposition"]?.match(/filename="?(.+)"?/)?.[1] ?? null,
    };
  } catch (error) {
    if (error.response?.data instanceof Blob && error.response.data.type === "application/json") {
      try {
        const text = await error.response.data.text();
        const jsonData = JSON.parse(text);
        if (jsonData.result && jsonData.result.status === "error") {
          throw new Error(jsonData.result.message || "Failed to fetch attachment");
        }
      } catch (e) {
        if (e instanceof Error) throw e;
      }
    }
    console.error("Get agent attachment error:", error);
    handleApiError(error, "Get agent attachment");
  }
};
