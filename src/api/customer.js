// Customer API functions
import { getApiEndpoint } from "../config/api";
import api from "./axios";
import { showApiModal } from "../components/ApiModal";

// Centralized error handler that also surfaces a modal for the user
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
      
      // Add validation errors if present
      if (responseData.result.errors && typeof responseData.result.errors === "object") {
        const errorDetails = Object.entries(responseData.result.errors)
          .map(([field, message]) => `• ${field}: ${message}`)
          .join("\n");
        if (errorDetails) {
          errorMessage = `${errorMessage}\n\nValidation Errors:\n${errorDetails}`;
        }
      }
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

// --- Small utilities -------------------------------------------------------
const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ?? null;
  } catch (_e) {
    return null;
  }
};

// Remove keys with value === undefined (keep null/empty string if intentionally provided)
const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

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

// Register Customer API
export const registerCustomerApi = async (customerData) => {
  try {
    const payload = removeUndefined({
      ...customerData,
      user_id: getCurrentUserId(),
      // Include attachments if provided
      attachments: Array.isArray(customerData.attachments) && customerData.attachments.length > 0
        ? customerData.attachments
        : undefined,
      // Ensure children is only sent when it's a non-empty array
      children: Array.isArray(customerData.children) && customerData.children.length > 0
        ? customerData.children.map((c) => removeUndefined(c))
        : undefined,
    });

    const response = await api.post(getApiEndpoint("CUSTOMER_REGISTER"), payload);
    const result = response.data;

    // Check if the JSON-RPC response indicates an error
    if (result && result.result && result.result.status === "error") {
      // Build detailed error message with validation errors
      let errorMessage = result.result.message || "Registration failed";
      
      // Add validation errors if present
      if (result.result.errors && typeof result.result.errors === "object") {
        const errorDetails = Object.entries(result.result.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join("\n");
        errorMessage = errorDetails ? `${errorMessage}\n\nValidation Errors:\n${errorDetails}` : errorMessage;
      }

      // Create an error object that will be caught
      const error = new Error(errorMessage);
      error.response = {
        data: result,
        status: 400, // Treat as bad request
      };
      throw error;
    }

    // Check if the response has the expected structure
    if (!result.result || result.result.status !== "success") {
      throw new Error("Invalid response from server");
    }

    return result;
  } catch (error) {
    console.error("Register customer error:", error);
    handleApiError(error, "Register customer");
  }
};

// Serialize query params: space as %20 (not +), keep @ as literal in email (API supports space and @ as-is)
const serializeCustomerParams = (params) =>
  Object.entries(params)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => {
      const encoded = encodeURIComponent(String(v).trim());
      const value = k === "email" ? encoded.replace(/%40/g, "@") : encoded;
      return `${encodeURIComponent(k)}=${value}`;
    })
    .join("&");

// Get Customers API - backend params: search (client name), client_code, email only (no sort_by, sort_order, page, page_size)
export const getCustomersApi = async (filterParams = {}) => {
  try {
    const params = {};
    if (filterParams) {
      const searchVal = filterParams.search;
      if (searchVal != null && String(searchVal).trim() !== "")
        params.search = String(searchVal).trim().replace(/\s+/g, " ");
      if (filterParams.client_code != null && String(filterParams.client_code).trim() !== "")
        params.client_code = String(filterParams.client_code).trim();
      if (filterParams.email != null && String(filterParams.email).trim() !== "")
        params.email = String(filterParams.email).trim();
      const cid = filterParams.country_id;
      if (cid != null && cid !== "" && !Number.isNaN(Number(cid)))
        params.country_id = parseInt(cid, 10);
    }
    params.page_size = "all";
    const queryString = serializeCustomerParams(params);
    const url = getApiEndpoint("CUSTOMERS") + (queryString ? `?${queryString}` : "");
    const response = await api.get(url);
    const responseData = response.data;
    
    // Check if response has error status (JSON-RPC format)
    if (responseData.result && responseData.result.status === 'error') {
      throw new Error(responseData.result.message || 'Failed to fetch customers');
    }
    
    // Handle different response formats
    // If response has result wrapper, extract it
    if (responseData.result && responseData.result.status === 'success') {
      return responseData.result;
    }
    
    // Return direct response if it has the expected structure
    return responseData;
  } catch (error) {
    console.error("Get customers error:", error);
    handleApiError(error, "Get customers");
  }
};

// Update Customer API
export const updateCustomerApi = async (customerId, data) => {
  try {
    const payload = removeUndefined({
      customer_id: customerId,
      name: data.name,
      client_code: data.client_code,
      company_type: data.company_type || "company",
      client_category: data.client_category,
      street: data.street,
      street2: data.street2,
      street3: data.street3,
      street4: data.street4,
      street5: data.street5,
      street6: data.street6,
      street7: data.street7,
      zip: data.zip,
      city: data.city,
      country_id: data.country_id,
      reg_no: data.reg_no,
      email: data.email,
      email2: data.email2,
      phone: data.phone,
      phone2: data.phone2,
      website: data.website,
      prefix: data.prefix,
      remarks: data.remarks,
      tariffs: data.tariffs || "",
      client_invoicing: data.client_invoicing || "",
      payment_term: data.payment_term,
      type_client: data.type_client,
      company_type_text: data.company_type_text,
      vessel_type: data.vessel_type,
      vessel_type1: data.vessel_type1,
      vessel_type2: data.vessel_type2,
      vessel_type3: data.vessel_type3,
      // Include attachments if provided
      attachments: Array.isArray(data.attachments) && data.attachments.length > 0
        ? data.attachments
        : undefined,
      attachment_to_delete: Array.isArray(data.attachment_to_delete) && data.attachment_to_delete.length > 0
        ? data.attachment_to_delete
        : undefined,
      // Include children array if provided (with operations: update, delete, create)
      children: Array.isArray(data.children) && data.children.length > 0
        ? data.children.map((child) => removeUndefined(child))
        : undefined,
    });

    const response = await api.post(getApiEndpoint("CUSTOMER_UPDATE"), payload);
    const result = response.data;

    // Check if the response indicates an error (even if HTTP 200)
    if (result && result.result && result.result.status === "error") {
      // Build detailed error message with validation errors
      let errorMessage = result.result.message || "Update failed";
      
      // Add validation errors if present
      if (result.result.errors && typeof result.result.errors === "object") {
        const errorDetails = Object.entries(result.result.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join("\n");
        errorMessage = errorDetails ? `${errorMessage}\n\nValidation Errors:\n${errorDetails}` : errorMessage;
      }

      // Create an error object that will be caught
      const error = new Error(errorMessage);
      error.response = {
        data: result,
        status: 400, // Treat as bad request
      };
      throw error;
    }

    return result;
  } catch (error) {
    console.error("Update customer error:", error);
    handleApiError(error, "Update customer");
  }
};

// Create Client Person for a Customer
export const createCustomerPersonApi = async (customerId, person) => {
  try {
    const payload = removeUndefined({
      current_user: getCurrentUserId(),
      customer_id: customerId,
      client_id: customerId,
      prefix: person.prefix,
      job_title: person.job_title,
      parent_id: customerId,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      tel_direct: person.tel_direct,
      phone: person.phone,
      tel_other: person.tel_other,
      linked_in: person.linked_in,
      remarks: person.remarks,
    });

    const response = await api.post(getApiEndpoint("CUSTOMER_UPDATE"), payload);
    return response.data;
  } catch (error) {
    console.error("Create customer person error:", error);
    handleApiError(error, "Create client person");
  }
};

// Delete Customer API
export const deleteCustomerApi = async (customerId) => {
  try {
    const payload = {
      customer_id: customerId,
    };
    const response = await api.delete(
      getApiEndpoint("CUSTOMER_DELETE"),
      { data: payload }
    );
    return response.data;
  } catch (error) {
    console.error("Delete customer error:", error);
    handleApiError(error, "Delete customer");
  }
};

/**
 * Get customer attachment file for viewing or download.
 * View: GET /api/customers/{customerId}/attachment/{attachmentId}/download
 * Download: GET /api/customers/{customerId}/attachment/{attachmentId}/download?download=true
 * Returns { data: Blob, type, filename }.
 */
export const getCustomerAttachmentApi = async (customerId, attachmentId, forceDownload = false) => {
  try {
    const baseUrl = getApiEndpoint("CUSTOMERS");
    const url = `${baseUrl}/${customerId}/attachment/${attachmentId}/download${forceDownload ? "?download=true" : ""}`;
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
    console.error("Get customer attachment error:", error);
    handleApiError(error, "Get customer attachment");
  }
};
