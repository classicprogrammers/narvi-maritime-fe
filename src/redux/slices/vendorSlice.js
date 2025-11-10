import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  countries: [],
  agents: [],
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

    // Get Agents
    getAgentsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    getAgentsSuccess: (state, action) => {
      state.isLoading = false;
      // Extract agents array from the API response
      state.agents = action.payload.agents || action.payload || [];
      state.error = null;
    },
    getAgentsFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },

    // Update Agent
    updateAgentStart: (state) => {
      state.updateLoading = true;
      state.updateError = null;
    },
    updateAgentSuccess: (state, action) => {
      state.updateLoading = false;
      // Update the agent in the agents array
      const index = state.agents.findIndex(
        (agent) => agent.id === action.payload.id
      );
      if (index !== -1) {
        state.agents[index] = action.payload;
      }
      state.updateError = null;
    },
    updateAgentFailure: (state, action) => {
      state.updateLoading = false;
      state.updateError = action.payload;
    },

    // Delete Agent
    deleteAgentStart: (state) => {
      state.deleteLoading = true;
      state.deleteError = null;
    },
    deleteAgentSuccess: (state, action) => {
      state.deleteLoading = false;
      // Remove the agent from the agents array
      // Handle ID comparison as string or number, and check multiple ID fields
      const deletedId = action.payload?.id || action.payload?.agent_id || action.payload?.vendor_id;
      if (deletedId) {
        state.agents = state.agents.filter((agent) => {
          const agentId = agent.id || agent.agent_id || agent.vendor_id;
          return String(agentId) !== String(deletedId);
        });
      }
      state.deleteError = null;
    },
    deleteAgentFailure: (state, action) => {
      state.deleteLoading = false;
      state.deleteError = action.payload;
    },

    // Clear errors
    clearAgentError: (state) => {
      state.error = null;
      state.updateError = null;
      state.deleteError = null;
    },

    // Add new agent
    addAgent: (state, action) => {
      state.agents.unshift(action.payload);
    },

    // Clear all agent state
    clearAgentState: (state) => {
      state.countries = [];
      state.agents = [];
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
  getAgentsStart,
  getAgentsSuccess,
  getAgentsFailure,
  updateAgentStart,
  updateAgentSuccess,
  updateAgentFailure,
  deleteAgentStart,
  deleteAgentSuccess,
  deleteAgentFailure,
  addAgent,
  clearAgentError,
  clearAgentState,
} = vendorSlice.actions;

export default vendorSlice.reducer;
