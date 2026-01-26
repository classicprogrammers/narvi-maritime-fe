import { 
  getStockListApi, 
  updateStockItemApi, 
  getStockItemByIdApi 
} from "../../api/stock";
import {
  getStockListStart,
  getStockListSuccess,
  getStockListFailure,
  updateStockItemStart,
  updateStockItemSuccess,
  updateStockItemFailure,
  clearStockError,
} from "../slices/stockSlice";

// Get stock list with pagination and search
export const getStockList = (params = {}) => async (dispatch) => {
  try {
    dispatch(getStockListStart());
    const response = await getStockListApi(params);
    dispatch(getStockListSuccess(response));
    return { success: true, data: response };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || "Failed to fetch stock list";
    dispatch(getStockListFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Update stock item
export const updateStockItem = (stockId, stockData, originalData = {}) => async (dispatch) => {
  try {
    dispatch(updateStockItemStart());
    const response = await updateStockItemApi(stockId, stockData, originalData);
    dispatch(updateStockItemSuccess(response));
    
    // Auto-refresh stock list after successful update (use current pagination state)
    if (response.result && response.result.status === 'success') {
      // Note: This will use default params if called without arguments
      // In a real scenario, you might want to preserve current pagination state
      dispatch(getStockList());
    }
    
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
