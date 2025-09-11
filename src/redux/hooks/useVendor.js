import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import {
  getCountries,
  getVendors,
  registerVendor,
  updateVendor,
  deleteVendor,
  addVendorToRedux,
} from "../actions/vendorActions";

export const useVendor = () => {
  const dispatch = useDispatch();
  const vendorState = useSelector((state) => state.vendor);

  // Memoize the action functions to prevent infinite re-renders
  const getCountriesCallback = useCallback(
    () => dispatch(getCountries()),
    [dispatch]
  );
  const getVendorsCallback = useCallback(
    () => dispatch(getVendors()),
    [dispatch]
  );
  const registerVendorCallback = useCallback(
    (vendorData) => dispatch(registerVendor(vendorData)),
    [dispatch]
  );
  const updateVendorCallback = useCallback(
    (vendorId, data) => dispatch(updateVendor(vendorId, data)),
    [dispatch]
  );
  const deleteVendorCallback = useCallback(
    (vendorId) => dispatch(deleteVendor(vendorId)),
    [dispatch]
  );
  const addVendorToReduxCallback = useCallback(
    (vendorData) => dispatch(addVendorToRedux(vendorData)),
    [dispatch]
  );

  return {
    // State
    countries: vendorState.countries,
    vendors: vendorState.vendors,
    isLoading: vendorState.isLoading,
    error: vendorState.error,
    updateLoading: vendorState.updateLoading,
    deleteLoading: vendorState.deleteLoading,
    updateError: vendorState.updateError,
    deleteError: vendorState.deleteError,

    // Actions
    getCountries: getCountriesCallback,
    getVendors: getVendorsCallback,
    registerVendor: registerVendorCallback,
    updateVendor: updateVendorCallback,
    deleteVendor: deleteVendorCallback,
    addVendorToRedux: addVendorToReduxCallback,
  };
};
