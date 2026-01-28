import {
  getCountriesStart,
  getCountriesSuccess,
  getCountriesFailure,
  getCustomersStart,
  getCustomersSuccess,
  getCustomersFailure,
  updateCustomerStart,
  updateCustomerSuccess,
  updateCustomerFailure,
  deleteCustomerStart,
  deleteCustomerSuccess,
  deleteCustomerFailure,
  addCustomer,
} from "../slices/customerSlice";
import {
  getCountriesApi,
  getCustomersApi,
  registerCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
} from "../../api/customer";

// Get Countries Action
export const getCountries = () => async (dispatch) => {
  try {
    dispatch(getCountriesStart());
    const result = await getCountriesApi();
    dispatch(getCountriesSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to fetch countries";
    dispatch(getCountriesFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Get Customers Action
export const getCustomers = (page = 1, page_size = 80) => async (dispatch) => {
  try {
    dispatch(getCustomersStart());
    const result = await getCustomersApi(page, page_size);
    dispatch(getCustomersSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to fetch customers";
    dispatch(getCustomersFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Update Customer Action
export const updateCustomer = (customerId, data) => async (dispatch) => {
  try {
    dispatch(updateCustomerStart());
    const result = await updateCustomerApi(customerId, data);
    dispatch(updateCustomerSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to update customer";
    dispatch(updateCustomerFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Delete Customer Action
export const deleteCustomer = (customerId) => async (dispatch) => {
  try {
    dispatch(deleteCustomerStart());
    const result = await deleteCustomerApi(customerId);
    dispatch(deleteCustomerSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to delete customer";
    dispatch(deleteCustomerFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Register Customer Action
export const registerCustomer = (customerData) => async (dispatch) => {
  try {
    const result = await registerCustomerApi(customerData);
    if (result.success) {
      // Refresh the customers list after successful registration (use current page)
      const currentPage = 1; // Reset to first page after registration
      dispatch(getCustomers(currentPage, 80));
    }
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to register customer";
    return { success: false, error: errorMessage };
  }
};

// Add Customer to Redux Action
export const addCustomerToRedux = (customerData) => (dispatch) => {
  dispatch(addCustomer(customerData));
  return { success: true };
};
