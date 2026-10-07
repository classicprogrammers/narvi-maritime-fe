import { 
  getStockListApi, 
  updateStockItemApi, 
  getStockItemByIdApi 
} from "../../api/stock";
import { stockListRequestKey } from "../../utils/stockListFetchParams";
import {
  getStockListStart,
  getStockListSuccess,
  getStockListFailure,
  updateStockItemStart,
  updateStockItemSuccess,
  updateStockItemFailure,
  clearStockError,
} from "../slices/stockSlice";

const inflightStockListRequests = new Map();

// Get stock list with pagination and search.
// Identical in-flight requests share one HTTP call so StrictMode remounts
// and overlapping page effects do not flash loading or hit the API twice.
export const getStockList = (params = {}) => (dispatch) => {
  const key = stockListRequestKey(params);
  const existing = inflightStockListRequests.get(key);
  if (existing) return existing;

  const request = (async () => {
    try {
      dispatch(getStockListStart());
      const response = await getStockListApi(params);
      dispatch(getStockListSuccess(response));
      return { success: true, data: response };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch stock list";
      dispatch(getStockListFailure(errorMessage));
      return { success: false, error: errorMessage };
    } finally {
      inflightStockListRequests.delete(key);
    }
  })();

  inflightStockListRequests.set(key, request);
  return request;
};

// Update stock item
export const updateStockItem = (stockId, stockData, originalData = {}) => async (dispatch) => {
  try {
    dispatch(updateStockItemStart());
    const response = await updateStockItemApi(stockId, stockData, originalData);
    dispatch(updateStockItemSuccess(response));
    return { success: true, data: response };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Failed to update stock item";
    dispatch(updateStockItemFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Get single stock item by ID
export const getStockItemById = (stockId) => async (dispatch) => {
  try {
    const response = await getStockItemByIdApi(stockId);
    return { success: true, data: response };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Failed to fetch stock item";
    return { success: false, error: errorMessage };
  }
};

// Clear stock errors
export const clearStockErrors = () => (dispatch) => {
  dispatch(clearStockError());
};
