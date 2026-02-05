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
  updateCustomerApi,
  deleteCustomerApi,
} from "../../api/customer";

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

export const getCustomers = (filterParams = {}) => async (dispatch) => {
  try {
    dispatch(getCustomersStart());
    const result = await getCustomersApi(filterParams);
    dispatch(getCustomersSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to fetch customers";
    dispatch(getCustomersFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

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

export const addCustomerToRedux = (customerData) => (dispatch) => {
  dispatch(addCustomer(customerData));
  return { success: true };
};
