import api from "./axios";

export const getClientStock = async (params = {}) => {
  try {
    const requestParams = {};
    if (params.search != null && String(params.search).trim() !== "") {
      requestParams.search = String(params.search).trim();
    }
    if (params.stock_status != null && String(params.stock_status).trim() !== "") {
      requestParams.stock_status = String(params.stock_status).trim();
    }

    const response = await api.get("/api/client/stock", { params: requestParams });
    const data = response.data || response;

    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch client stock");
    }

    return {
      status: data.status || "success",
      count: data.count ?? 0,
      client: data.client || null,
      stock_list: Array.isArray(data.stock_list) ? data.stock_list : [],
    };
  } catch (error) {
    throw error;
  }
};

const clientStockApi = {
  getClientStock,
};

export default clientStockApi;

