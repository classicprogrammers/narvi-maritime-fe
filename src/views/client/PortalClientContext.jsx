import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getClientContext } from "api/clientContext";
import {
  PORTAL_CLIENT_ACCESS_DENIED_EVENT,
  PORTAL_CLIENT_ACCESS_DENIED_MESSAGE,
  PORTAL_CLIENT_MISSING_MESSAGE,
  clearSelectedPortalClientId,
  getPortalApiErrorMessage,
  getSelectedPortalClientId,
  isPortalClientSelectionError,
  setSelectedPortalClientId,
} from "utils/portalClientSelection";

const PortalClientContext = createContext(null);

function chooseClient(clients, preferredId, blockedIds) {
  const allowed = clients.filter((client) => !blockedIds.has(client.id));
  if (!allowed.length) return null;
  return allowed.find((client) => client.id === preferredId) || allowed[0];
}

export function PortalClientProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [multiClient, setMultiClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const blockedIdsRef = useRef(new Set());
  const recoveringRef = useRef(false);

  const applyClientList = useCallback((list, isMulti, preferredId) => {
    const next = chooseClient(list, preferredId, blockedIdsRef.current);
    setClients(list);
    setMultiClient(isMulti || list.length > 1);
    if (!next) {
      clearSelectedPortalClientId();
      setSelectedClientId(null);
      setError(
        list.length
          ? PORTAL_CLIENT_ACCESS_DENIED_MESSAGE
          : PORTAL_CLIENT_MISSING_MESSAGE
      );
      return null;
    }
    setSelectedPortalClientId(next.id);
    setSelectedClientId(next.id);
    setError("");
    recoveringRef.current = false;
    return next.id;
  }, []);

  const loadContext = useCallback(async () => {
    const requestId = ++requestRef.current;
    const attemptedId = getSelectedPortalClientId();
    setLoading(true);
    setError("");

    try {
      const result = await getClientContext();
      if (requestId !== requestRef.current) return;
      if (!result.clients.length) {
        clearSelectedPortalClientId();
        setClients([]);
        setSelectedClientId(null);
        setMultiClient(false);
        setError(PORTAL_CLIENT_MISSING_MESSAGE);
        return;
      }
      applyClientList(result.clients, result.multiClient, getSelectedPortalClientId() ?? attemptedId);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      const message = getPortalApiErrorMessage(error, "Failed to load clients.");
      const selectionDenied =
        isPortalClientSelectionError(message) || Number(error?.response?.status) === 403;
      if (selectionDenied) {
        if (attemptedId != null) blockedIdsRef.current.add(attemptedId);
        clearSelectedPortalClientId();
        if (attemptedId == null) {
          setClients([]);
          setSelectedClientId(null);
          setError(message || PORTAL_CLIENT_ACCESS_DENIED_MESSAGE);
          return;
        }
        try {
          const retry = await getClientContext();
          if (requestId !== requestRef.current) return;
          if (!retry.clients.length) {
            setClients([]);
            setSelectedClientId(null);
            setError(PORTAL_CLIENT_MISSING_MESSAGE);
            return;
          }
          applyClientList(retry.clients, retry.multiClient, null);
          return;
        } catch (retryError) {
          if (requestId !== requestRef.current) return;
          setClients([]);
          setSelectedClientId(null);
          setError(getPortalApiErrorMessage(retryError, message));
          return;
        }
      }
      setClients([]);
      setSelectedClientId(null);
      setError(message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [applyClientList]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    const onDenied = (event) => {
      const deniedId = event?.detail?.clientId;
      if (deniedId != null) blockedIdsRef.current.add(Number(deniedId));
      clearSelectedPortalClientId();
      if (recoveringRef.current) {
        setSelectedClientId(null);
        setLoading(false);
        setError(PORTAL_CLIENT_ACCESS_DENIED_MESSAGE);
        return;
      }
      recoveringRef.current = true;
      setSelectedClientId(null);
      loadContext();
    };
    window.addEventListener(PORTAL_CLIENT_ACCESS_DENIED_EVENT, onDenied);
    return () => window.removeEventListener(PORTAL_CLIENT_ACCESS_DENIED_EVENT, onDenied);
  }, [loadContext]);

  const selectClient = useCallback(
    (value) => {
      const id = Number(value);
      if (!Number.isInteger(id)) return;
      if (!clients.some((client) => client.id === id)) return;
      if (id === selectedClientId) return;
      blockedIdsRef.current.delete(id);
      setSelectedPortalClientId(id);
      setSelectedClientId(id);
      setError("");
    },
    [clients, selectedClientId]
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const value = useMemo(
    () => ({
      clients,
      selectedClientId,
      selectedClient,
      multiClient,
      loading,
      error,
      selectClient,
      reloadClients: loadContext,
    }),
    [clients, selectedClientId, selectedClient, multiClient, loading, error, selectClient, loadContext]
  );

  return <PortalClientContext.Provider value={value}>{children}</PortalClientContext.Provider>;
}

export function usePortalClient() {
  const value = useContext(PortalClientContext);
  if (!value) {
    throw new Error("usePortalClient must be used within PortalClientProvider");
  }
  return value;
}
