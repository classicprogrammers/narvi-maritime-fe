import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  countries: [],
  customers: [],
  isLoading: false,
  error: null,
  updateLoading: false,
  updateError: null,
  deleteLoading: false,
  deleteError: null,
};

const customerSlice = createSlice({
  name: "customer",
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

    // Get Customers
    getCustomersStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getCustomersSuccess: (state, action) => {
      state.isLoading = false;
      // Extract customers array from the API response
      state.customers = action.payload.customers || action.payload || [];
      state.error = null;
    },
    getCustomersFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Update Customer
    updateCustomerStart: (state) => {
      state.updateLoading = true;
      state.updateError = null;
    },
    updateCustomerSuccess: (state, action) => {
      state.updateLoading = false;
      // Update the customer in the customers array
      const index = state.customers.findIndex(
        (customer) => customer.id === action.payload.id
      );
      if (index !== -1) {
        state.customers[index] = action.payload;
      }
      state.updateError = null;
    },
    updateCustomerFailure: (state, action) => {
      state.updateLoading = false;
      state.updateError = action.payload;
    },

    // Delete Customer
    deleteCustomerStart: (state) => {
      state.deleteLoading = true;
      state.deleteError = null;
    },
    deleteCustomerSuccess: (state, action) => {
      state.deleteLoading = false;
      // Remove the customer from the customers array
      state.customers = state.customers.filter(
        (customer) => customer.id !== action.payload.id
      );
      state.deleteError = null;
    },
    deleteCustomerFailure: (state, action) => {
      state.deleteLoading = false;
      state.deleteError = action.payload;
    },

    // Clear errors
    clearCustomerError: (state) => {
      state.error = null;
      state.updateError = null;
      state.deleteError = null;
    },

    // Add new customer
    addCustomer: (state, action) => {
      state.customers.unshift(action.payload);
    },

    // Clear all customer state
    clearCustomerState: (state) => {
      state.countries = [];
      state.customers = [];
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
  clearCustomerError,
  clearCustomerState,
} = customerSlice.actions;

export default customerSlice.reducer;
