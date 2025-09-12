import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  stockList: [],
  isLoading: false,
  error: null,
  updateLoading: false,
  updateError: null,
  count: 0,
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
      state.stockList = action.payload.stock_list || [];
      state.count = action.payload.count || 0;
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
