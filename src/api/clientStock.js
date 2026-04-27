import api from "./axios";
import { buildCommonStockJobFilters } from "./commonFilterBuilder";

export const getClientStock = async (params = {}) => {
  try {
    const requestParams = buildCommonStockJobFilters(params, "stock");

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

