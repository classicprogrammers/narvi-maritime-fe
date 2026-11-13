import { useEffect, useState } from "react";
import { getDocumentTypes } from "../api/attachments";
import { DEFAULT_DOCUMENT_TYPES } from "../utils/documentTypes";

// One request for the whole session; the built-in list is used until it arrives or if it fails
let cachedTypes = null;
let inflight = null;

const loadDocumentTypes = () => {
  if (cachedTypes) return Promise.resolve(cachedTypes);
  if (!inflight) {
    inflight = getDocumentTypes()
      .then((types) => {
        if (types.length) cachedTypes = types;
        return cachedTypes || DEFAULT_DOCUMENT_TYPES;
      })
      .catch(() => DEFAULT_DOCUMENT_TYPES)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

export default function useDocumentTypes() {
  const [types, setTypes] = useState(cachedTypes || DEFAULT_DOCUMENT_TYPES);

  useEffect(() => {
    let alive = true;
    loadDocumentTypes().then((list) => {
      if (alive) setTypes(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  return types;
}
