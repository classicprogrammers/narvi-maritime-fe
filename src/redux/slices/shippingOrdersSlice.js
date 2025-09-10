import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getShippingOrders, getShippingOrderById, createShippingOrder, updateShippingOrder, deleteShippingOrder } from "../../api/shippingOrders";

// Async thunks
export const fetchShippingOrders = createAsyncThunk(
  'shippingOrders/fetchShippingOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getShippingOrders();
      return response;
    } catch (error) {
      // Handle different error response structures
      let errorMessage = error.message;

      if (error.response?.data?.result?.message) {
        errorMessage = error.response.data.result.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchShippingOrderById = createAsyncThunk(
  'shippingOrders/fetchShippingOrderById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await getShippingOrderById(id);
      return response;
    } catch (error) {
      // Handle different error response structures
      let errorMessage = error.message;

      if (error.response?.data?.result?.message) {
        errorMessage = error.response.data.result.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const createNewShippingOrder = createAsyncThunk(
  'shippingOrders/createShippingOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await createShippingOrder(orderData);
      
      // Double-check: if response contains JSON-RPC error, throw error
      if (response.result && response.result.status === 'error') {
        throw new Error(response.result.message || 'Failed to create shipping order');
      }
      
      return response;
    } catch (error) {
      // Handle different error response structures
      let errorMessage = error.message;

      if (error.response?.data?.result?.message) {
        errorMessage = error.response.data.result.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const updateExistingShippingOrder = createAsyncThunk(
  'shippingOrders/updateShippingOrder',
  async ({ id, orderData }, { rejectWithValue }) => {
    try {
      const response = await updateShippingOrder(id, orderData);
      
      // Double-check: if response contains JSON-RPC error, throw error
      if (response.result && response.result.status === 'error') {
        throw new Error(response.result.message || 'Failed to update shipping order');
      }
      
      return response;
    } catch (error) {
      // Handle different error response structures
      let errorMessage = error.message;

      if (error.response?.data?.result?.message) {
        errorMessage = error.response.data.result.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteExistingShippingOrder = createAsyncThunk(
  'shippingOrders/deleteShippingOrder',
  async (id, { rejectWithValue }) => {
    try {
      const response = await deleteShippingOrder(id);
      
      // Double-check: if response contains JSON-RPC error, throw error
      if (response.result && response.result.status === 'error') {
        throw new Error(response.result.message || 'Failed to delete shipping order');
      }
      
      return response;
    } catch (error) {
      // Handle different error response structures
      let errorMessage = error.message;

      if (error.response?.data?.result?.message) {
        errorMessage = error.response.data.result.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  orders: [],
  currentOrder: null,
  count: 0,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  createError: null,
  updateError: null,
  deleteError: null,
};

const shippingOrdersSlice = createSlice({
  name: "shippingOrders",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch shipping orders
    builder
      .addCase(fetchShippingOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchShippingOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload.orders || [];
        state.count = action.payload.count || 0;
        state.error = null;
      })
      .addCase(fetchShippingOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Fetch shipping order by ID
    builder
      .addCase(fetchShippingOrderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchShippingOrderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchShippingOrderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Create shipping order
    builder
      .addCase(createNewShippingOrder.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
      })
      .addCase(createNewShippingOrder.fulfilled, (state, action) => {
        state.isCreating = false;
        state.orders.unshift(action.payload);
        state.count += 1;
        state.createError = null;
      })
      .addCase(createNewShippingOrder.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload;
      });

    // Update shipping order
    builder
      .addCase(updateExistingShippingOrder.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
      })
      .addCase(updateExistingShippingOrder.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.currentOrder && state.currentOrder.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
        state.updateError = null;
      })
      .addCase(updateExistingShippingOrder.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload;
      });

    // Delete shipping order
    builder
      .addCase(deleteExistingShippingOrder.pending, (state) => {
        state.isDeleting = true;
        state.deleteError = null;
      })
      .addCase(deleteExistingShippingOrder.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.orders = state.orders.filter(order => order.id !== action.payload.id);
        state.count -= 1;
        if (state.currentOrder && state.currentOrder.id === action.payload.id) {
          state.currentOrder = null;
        }
        state.deleteError = null;
      })
      .addCase(deleteExistingShippingOrder.rejected, (state, action) => {
        state.isDeleting = false;
        state.deleteError = action.payload;
      });
  },
});

export const { clearError, clearCurrentOrder, setCurrentOrder } = shippingOrdersSlice.actions;
export default shippingOrdersSlice.reducer;
