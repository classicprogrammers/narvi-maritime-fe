import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import {
  getCountries,
  getAgents,
  registerAgent,
  updateAgent,
  deleteAgent,
  addAgentToRedux,
} from "../actions/vendorActions";

export const useVendor = () => {
  const dispatch = useDispatch();
  const vendorState = useSelector((state) => state.vendor);

  // Memoize the action functions to prevent infinite re-renders
  const getCountriesCallback = useCallback(
    () => dispatch(getCountries()),
    [dispatch]
  );
  const getAgentsCallback = useCallback(
    (page = 1, page_size = 80) => dispatch(getAgents(page, page_size)),
    [dispatch]
  );
  const registerAgentCallback = useCallback(
    (agentData) => dispatch(registerAgent(agentData)),
    [dispatch]
  );
  const updateAgentCallback = useCallback(
    (agentId, data) => dispatch(updateAgent(agentId, data)),
    [dispatch]
  );
  const deleteAgentCallback = useCallback(
    (agentId) => dispatch(deleteAgent(agentId)),
    [dispatch]
  );
  const addAgentToReduxCallback = useCallback(
    (agentData) => dispatch(addAgentToRedux(agentData)),
    [dispatch]
  );

  return {
    // State
    countries: vendorState.countries,
    agents: vendorState.agents,
    vendors: vendorState.agents, // Keep vendors for backward compatibility
    isLoading: vendorState.isLoading,
    error: vendorState.error,
    updateLoading: vendorState.updateLoading,
    deleteLoading: vendorState.deleteLoading,
    updateError: vendorState.updateError,
    deleteError: vendorState.deleteError,
    pagination: vendorState.pagination,

    // Actions
    getCountries: getCountriesCallback,
    getAgents: getAgentsCallback,
    getVendors: getAgentsCallback, // Keep getVendors for backward compatibility
    registerAgent: registerAgentCallback,
    registerVendor: registerAgentCallback, // Keep registerVendor for backward compatibility
    updateAgent: updateAgentCallback,
    updateVendor: updateAgentCallback, // Keep updateVendor for backward compatibility
    deleteAgent: deleteAgentCallback,
    deleteVendor: deleteAgentCallback, // Keep deleteVendor for backward compatibility
    addAgentToRedux: addAgentToReduxCallback,
    addVendorToRedux: addAgentToReduxCallback, // Keep addVendorToRedux for backward compatibility
  };
};
