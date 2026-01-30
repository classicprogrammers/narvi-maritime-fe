import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import {
  getCountries,
  getCustomers,
  registerCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerToRedux,
} from "../actions/customerActions";

export const useCustomer = () => {
  const dispatch = useDispatch();
  const customerState = useSelector((state) => state.customer);

  // Memoize the action functions to prevent infinite re-renders
  const getCountriesCallback = useCallback(
    () => dispatch(getCountries()),
    [dispatch]
  );
  const getCustomersCallback = useCallback(
    (filterParams = {}) => dispatch(getCustomers(filterParams)),
    [dispatch]
  );
  const registerCustomerCallback = useCallback(
    (customerData) => dispatch(registerCustomer(customerData)),
    [dispatch]
  );
  const updateCustomerCallback = useCallback(
    (customerId, data) => dispatch(updateCustomer(customerId, data)),
    [dispatch]
  );
  const deleteCustomerCallback = useCallback(
    (customerId) => dispatch(deleteCustomer(customerId)),
    [dispatch]
  );
  const addCustomerToReduxCallback = useCallback(
    (customerData) => dispatch(addCustomerToRedux(customerData)),
    [dispatch]
  );

  return {
    // State
    countries: customerState.countries,
    customers: customerState.customers,
    isLoading: customerState.isLoading,
    error: customerState.error,
    updateLoading: customerState.updateLoading,
    deleteLoading: customerState.deleteLoading,
    updateError: customerState.updateError,
    deleteError: customerState.deleteError,
    pagination: customerState.pagination,

    // Actions
    getCountries: getCountriesCallback,
    getCustomers: getCustomersCallback,
    registerCustomer: registerCustomerCallback,
    updateCustomer: updateCustomerCallback,
    deleteCustomer: deleteCustomerCallback,
    addCustomerToRedux: addCustomerToReduxCallback,
  };
};
