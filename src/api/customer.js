import { getApiEndpoint } from "../config/api";
import api from "./axios";
import { showApiModal } from "../components/ApiModal";

const handleApiError = (error, operation) => {
  console.error(`${operation} failed:`, error);

  let errorMessage = error.message || `Failed to ${operation.toLowerCase()}`;

  if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
    errorMessage =
      "Cannot connect to backend server. Please check if the server is running and CORS is properly configured.";
  }

  if (error.response) {
    const responseData = error.response.data;

    if (responseData && responseData.result && responseData.result.status === 'error') {
      errorMessage = responseData.result.message || errorMessage;

      if (responseData.result.errors && typeof responseData.result.errors === "object") {
        const errorDetails = Object.entries(responseData.result.errors)
          .map(([field, message]) => `• ${field}: ${message}`)
          .join("\n");
        if (errorDetails) {
          errorMessage = `${errorMessage}\n\nValidation Errors:\n${errorDetails}`;
        }
      }
    }
    else if (responseData && responseData.message) {
      errorMessage = responseData.message;
    }
    else if (responseData && responseData.error) {
      errorMessage = responseData.error;
    }
    else {
      errorMessage = `Backend error (${error.response.status}): ${errorMessage}`;
    }
  }

  showApiModal("error", `${operation} Failed`, errorMessage);

  throw new Error(errorMessage);
};

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

const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export const getCountriesApi = async () => {
  try {
    const response = await api.get(getApiEndpoint("COUNTRIES"));
    return response.data;
  } catch (error) {
    console.error("Get countries error:", error);
    handleApiError(error, "Get countries");
  }
};

export const registerCustomerApi = async (customerData) => {
  try {
    const payload = removeUndefined({
      ...customerData,
      user_id: getCurrentUserId(),
      attachments: Array.isArray(customerData.attachments) && customerData.attachments.length > 0
        ? customerData.attachments
        : undefined,
      children: Array.isArray(customerData.children) && customerData.children.length > 0
        ? customerData.children.map((c) => removeUndefined(c))
        : undefined,
    });

    const response = await api.post(getApiEndpoint("CUSTOMER_REGISTER"), payload);
    const result = response.data;

    if (result && result.result && result.result.status === "error") {
      let errorMessage = result.result.message || "Registration failed";

      if (result.result.errors && typeof result.result.errors === "object") {
        const errorDetails = Object.entries(result.result.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join("\n");
        errorMessage = errorDetails ? `${errorMessage}\n\nValidation Errors:\n${errorDetails}` : errorMessage;
      }

      const error = new Error(errorMessage);
      error.response = {
        data: result,
        status: 400,
      };
      throw error;
    }

    if (!result.result || result.result.status !== "success") {
      throw new Error("Invalid response from server");
    }

    return result;
  } catch (error) {
    console.error("Register customer error:", error);
    handleApiError(error, "Register customer");
  }
};

const serializeCustomerParams = (params) =>
  Object.entries(params)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => {
      const encoded = encodeURIComponent(String(v).trim());
      const value = k === "email" ? encoded.replace(/%40/g, "@") : encoded;
      return `${encodeURIComponent(k)}=${value}`;
    })
    .join("&");

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
    const queryString = serializeCustomerParams(params);
    const url = getApiEndpoint("CUSTOMERS") + (queryString ? `?${queryString}` : "");
    const response = await api.get(url);
    const responseData = response.data;

    if (responseData.result && responseData.result.status === 'error') {
      throw new Error(responseData.result.message || 'Failed to fetch customers');
    }

    if (responseData.result && responseData.result.status === 'success') {
      return responseData.result;
    }

    return responseData;
  } catch (error) {
    console.error("Get customers error:", error);
    handleApiError(error, "Get customers");
  }
};

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
      attachments: Array.isArray(data.attachments) && data.attachments.length > 0
        ? data.attachments
        : undefined,
      attachment_to_delete: Array.isArray(data.attachment_to_delete) && data.attachment_to_delete.length > 0
        ? data.attachment_to_delete
        : undefined,
      children: Array.isArray(data.children) && data.children.length > 0
        ? data.children.map((child) => removeUndefined(child))
        : undefined,
    });

    const response = await api.post(getApiEndpoint("CUSTOMER_UPDATE"), payload);
    const result = response.data;

    if (result && result.result && result.result.status === "error") {
      let errorMessage = result.result.message || "Update failed";

      if (result.result.errors && typeof result.result.errors === "object") {
        const errorDetails = Object.entries(result.result.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join("\n");
        errorMessage = errorDetails ? `${errorMessage}\n\nValidation Errors:\n${errorDetails}` : errorMessage;
      }

      const error = new Error(errorMessage);
      error.response = {
        data: result,
        status: 400,
      };
      throw error;
    }

    return result;
  } catch (error) {
    console.error("Update customer error:", error);
    handleApiError(error, "Update customer");
  }
};

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
