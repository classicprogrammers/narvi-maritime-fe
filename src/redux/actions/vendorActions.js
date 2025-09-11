import {
  getCountriesStart,
  getCountriesSuccess,
  getCountriesFailure,
  getVendorsStart,
  getVendorsSuccess,
  getVendorsFailure,
  updateVendorStart,
  updateVendorSuccess,
  updateVendorFailure,
  deleteVendorStart,
  deleteVendorSuccess,
  deleteVendorFailure,
  addVendor,
} from "../slices/vendorSlice";
import {
  getCountriesApi,
  getVendorsApi,
  registerVendorApi,
  updateVendorApi,
  deleteVendorApi,
} from "../../api/vendor";

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

// Get Vendors Action
export const getVendors = () => async (dispatch) => {
  try {
    dispatch(getVendorsStart());
    const result = await getVendorsApi();
    dispatch(getVendorsSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to fetch vendors";
    dispatch(getVendorsFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Update Vendor Action
export const updateVendor = (vendorId, data) => async (dispatch) => {
  try {
    dispatch(updateVendorStart());
    const result = await updateVendorApi(vendorId, data);
    dispatch(updateVendorSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to update vendor";
    dispatch(updateVendorFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Delete Vendor Action
export const deleteVendor = (vendorId) => async (dispatch) => {
  try {
    dispatch(deleteVendorStart());
    const result = await deleteVendorApi(vendorId);
    dispatch(deleteVendorSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to delete vendor";
    dispatch(deleteVendorFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Register Vendor Action
export const registerVendor = (vendorData) => async (dispatch) => {
  try {
    const result = await registerVendorApi(vendorData);
    if (result.success) {
      // Refresh the vendors list after successful registration
      dispatch(getVendors());
    }
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to register vendor";
    return { success: false, error: errorMessage };
  }
};

// Add Vendor to Redux Action
export const addVendorToRedux = (vendorData) => (dispatch) => {
  dispatch(addVendor(vendorData));
  return { success: true };
};
