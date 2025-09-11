import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  countries: [],
  vendors: [],
  isLoading: false,
  error: null,
  updateLoading: false,
  updateError: null,
  deleteLoading: false,
  deleteError: null,
};

const vendorSlice = createSlice({
  name: "vendor",
  initialState,
  reducers: {
    // Get Countries
    getCountriesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getCountriesSuccess: (state, action) => {
      state.isLoading = false;
      state.countries = action.payload;
      state.error = null;
    },
    getCountriesFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Get Vendors
    getVendorsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getVendorsSuccess: (state, action) => {
      state.isLoading = false;
      // Extract vendors array from the API response
      state.vendors = action.payload.vendors || action.payload || [];
      state.error = null;
    },
    getVendorsFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Update Vendor
    updateVendorStart: (state) => {
      state.updateLoading = true;
      state.updateError = null;
    },
    updateVendorSuccess: (state, action) => {
      state.updateLoading = false;
      // Update the vendor in the vendors array
      const index = state.vendors.findIndex(
        (vendor) => vendor.id === action.payload.id
      );
      if (index !== -1) {
        state.vendors[index] = action.payload;
      }
      state.updateError = null;
    },
    updateVendorFailure: (state, action) => {
      state.updateLoading = false;
      state.updateError = action.payload;
    },

    // Delete Vendor
    deleteVendorStart: (state) => {
      state.deleteLoading = true;
      state.deleteError = null;
    },
    deleteVendorSuccess: (state, action) => {
      state.deleteLoading = false;
      // Remove the vendor from the vendors array
      state.vendors = state.vendors.filter(
        (vendor) => vendor.id !== action.payload.id
      );
      state.deleteError = null;
    },
    deleteVendorFailure: (state, action) => {
      state.deleteLoading = false;
      state.deleteError = action.payload;
    },

    // Clear errors
    clearVendorError: (state) => {
      state.error = null;
      state.updateError = null;
      state.deleteError = null;
    },

    // Add new vendor
    addVendor: (state, action) => {
      state.vendors.unshift(action.payload);
    },

    // Clear all vendor state
    clearVendorState: (state) => {
      state.countries = [];
      state.vendors = [];
      state.isLoading = false;
      state.error = null;
      state.updateLoading = false;
      state.updateError = null;
      state.deleteLoading = false;
      state.deleteError = null;
    },
  },
});

export const {
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
  clearVendorError,
  clearVendorState,
} = vendorSlice.actions;

export default vendorSlice.reducer;
