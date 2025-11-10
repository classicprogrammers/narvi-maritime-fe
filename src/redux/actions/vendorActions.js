import {
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

// Get Agents Action
export const getAgents = () => async (dispatch) => {
  try {
    dispatch(getAgentsStart());
    const result = await getVendorsApi();
    dispatch(getAgentsSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to fetch agents";
    dispatch(getAgentsFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Update Agent Action
export const updateAgent = (agentId, data) => async (dispatch) => {
  try {
    dispatch(updateAgentStart());
    const result = await updateVendorApi(agentId, data);
    dispatch(updateAgentSuccess(result));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to update agent";
    dispatch(updateAgentFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Delete Agent Action
export const deleteAgent = (agentId) => async (dispatch) => {
  try {
    dispatch(deleteAgentStart());
    const result = await deleteVendorApi(agentId);
    // Pass the agentId in the payload so the slice can filter it out
    // The API response might not have the id field in the expected format
    const payload = { 
      id: agentId,
      ...(result?.result?.data || result?.data || result?.result || result || {})
    };
    dispatch(deleteAgentSuccess(payload));
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to delete agent";
    dispatch(deleteAgentFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Register Agent Action
export const registerAgent = (agentData) => async (dispatch) => {
  try {
    const result = await registerVendorApi(agentData);
    if (result.success) {
      // Refresh the agents list after successful registration
      dispatch(getAgents());
    }
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Failed to register agent";
    return { success: false, error: errorMessage };
  }
};

// Add Agent to Redux Action
export const addAgentToRedux = (agentData) => (dispatch) => {
  dispatch(addAgent(agentData));
  return { success: true };
};
