import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  stockList: [],
  isLoading: false,
  error: null,
  updateLoading: false,
  updateError: null,
  count: 0,
  total_count: 0,
  page: 1,
  page_size: 50,
  total_pages: 0,
  has_next: false,
  has_previous: false,
};

const stockSlice = createSlice({
  name: "stock",
  initialState,
  reducers: {
    // Get stock list
    getStockListStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getStockListSuccess: (state, action) => {
      state.isLoading = false;
      state.stockList = action.payload.stock_list || action.payload.stockList || [];
      state.count = action.payload.count || 0;
      state.total_count = action.payload.total_count || 0;
      state.page = action.payload.page || 1;
      state.page_size = action.payload.page_size || 80;
      state.total_pages = action.payload.total_pages || 0;
      state.has_next = action.payload.has_next || false;
      state.has_previous = action.payload.has_previous || false;
      state.error = null;
    },
    getStockListFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Update stock item
    updateStockItemStart: (state) => {
      state.updateLoading = true;
      state.updateError = null;
    },
    updateStockItemSuccess: (state, action) => {
      state.updateLoading = false;
      const updatedItem = action.payload;
      const index = state.stockList.findIndex(item => item.id === updatedItem.id);
      if (index !== -1) {
        state.stockList[index] = updatedItem;
      }
      state.updateError = null;
    },
    updateStockItemFailure: (state, action) => {
      state.updateLoading = false;
      state.updateError = action.payload;
    },

    // Clear errors
    clearStockError: (state) => {
      state.error = null;
      state.updateError = null;
    },

    // Clear stock state
    clearStockState: (state) => {
      state.stockList = [];
      state.isLoading = false;
      state.error = null;
      state.updateLoading = false;
      state.updateError = null;
      state.count = 0;
    },
  },
});

export const {
  getStockListStart,
  getStockListSuccess,
  getStockListFailure,
  updateStockItemStart,
  updateStockItemSuccess,
  updateStockItemFailure,
  clearStockError,
  clearStockState,
} = stockSlice.actions;

export default stockSlice.reducer;
