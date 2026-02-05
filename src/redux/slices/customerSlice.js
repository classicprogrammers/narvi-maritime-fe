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
  pagination: {
    page: 1,
    page_size: 80,
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  },
};

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
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

    getCustomersStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getCustomersSuccess: (state, action) => {
      state.isLoading = false;
      const response = action.payload;
      state.customers = response.customers || response || [];
      
      // Update pagination metadata if available
      if (response.page !== undefined) {
        state.pagination = {
          page: response.page || 1,
          page_size: response.page_size || 80,
          total_count: response.total_count || 0,
          total_pages: response.total_pages || 0,
          has_next: response.has_next || false,
          has_previous: response.has_previous || false,
        };
      }
      
      state.error = null;
    },
    getCustomersFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    updateCustomerStart: (state) => {
      state.updateLoading = true;
      state.updateError = null;
    },
    updateCustomerSuccess: (state, action) => {
      state.updateLoading = false;
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
      state.customers = state.customers.filter(
        (customer) => customer.id !== action.payload.id
      );
      state.deleteError = null;
    },
    deleteCustomerFailure: (state, action) => {
      state.deleteLoading = false;
      state.deleteError = action.payload;
    },

    clearCustomerError: (state) => {
      state.error = null;
      state.updateError = null;
      state.deleteError = null;
    },

    addCustomer: (state, action) => {
      state.customers.unshift(action.payload);
    },

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
