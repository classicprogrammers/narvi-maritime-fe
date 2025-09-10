import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import {
  fetchShippingOrders,
  fetchShippingOrderById,
  createNewShippingOrder,
  updateExistingShippingOrder,
  deleteExistingShippingOrder,
  clearError,
  clearCurrentOrder,
  setCurrentOrder,
} from "../slices/shippingOrdersSlice";

export const useShippingOrders = () => {
  const dispatch = useDispatch();
  const shippingOrdersState = useSelector((state) => state.shippingOrders);

  // Memoize the action functions to prevent unnecessary re-renders
  const fetchOrders = useCallback(() => dispatch(fetchShippingOrders()), [dispatch]);
  const fetchOrderById = useCallback((id) => dispatch(fetchShippingOrderById(id)), [dispatch]);
  const createOrder = useCallback((orderData) => dispatch(createNewShippingOrder(orderData)), [dispatch]);
  const updateOrder = useCallback((id, orderData) => dispatch(updateExistingShippingOrder({ id, orderData })), [dispatch]);
  const deleteOrder = useCallback((id) => dispatch(deleteExistingShippingOrder(id)), [dispatch]);
  const clearErrorAction = useCallback(() => dispatch(clearError()), [dispatch]);
  const clearCurrentOrderAction = useCallback(() => dispatch(clearCurrentOrder()), [dispatch]);
  const setCurrentOrderAction = useCallback((order) => dispatch(setCurrentOrder(order)), [dispatch]);

  return {
    // State
    orders: shippingOrdersState.orders,
    currentOrder: shippingOrdersState.currentOrder,
    count: shippingOrdersState.count,
    isLoading: shippingOrdersState.isLoading,
    isCreating: shippingOrdersState.isCreating,
    isUpdating: shippingOrdersState.isUpdating,
    isDeleting: shippingOrdersState.isDeleting,
    error: shippingOrdersState.error,
    createError: shippingOrdersState.createError,
    updateError: shippingOrdersState.updateError,
    deleteError: shippingOrdersState.deleteError,

    // Actions
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    clearError: clearErrorAction,
    clearCurrentOrder: clearCurrentOrderAction,
    setCurrentOrder: setCurrentOrderAction,
  };
};
