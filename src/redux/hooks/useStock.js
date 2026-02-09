import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import {
  getStockList,
  updateStockItem,
  getStockItemById,
  clearStockErrors,
} from "../actions/stockActions";

export const useStock = () => {
  const dispatch = useDispatch();
  const {
    stockList,
    isLoading,
    error,
    updateLoading,
    updateError,
    count,
    total_count,
    page,
    page_size,
    total_pages,
    has_next,
    has_previous,
  } = useSelector((state) => state.stock);

  const fetchStockList = useCallback((params = {}) => {
    return dispatch(getStockList(params));
  }, [dispatch]);

  const updateStockItemAction = useCallback((stockId, stockData, originalData = {}) => {
    return dispatch(updateStockItem(stockId, stockData, originalData));
  }, [dispatch]);

  const fetchStockItemById = useCallback((stockId) => {
    return dispatch(getStockItemById(stockId));
  }, [dispatch]);

  const clearErrors = useCallback(() => {
    dispatch(clearStockErrors());
  }, [dispatch]);

  return {
    // State
    stockList,
    isLoading,
    error,
    updateLoading,
    updateError,
    count,
    total_count,
    page,
    page_size,
    total_pages,
    has_next,
    has_previous,
    
    // Actions
    getStockList: fetchStockList,
    updateStockItem: updateStockItemAction,
    getStockItemById: fetchStockItemById,
    clearStockError: clearErrors,
  };
};
