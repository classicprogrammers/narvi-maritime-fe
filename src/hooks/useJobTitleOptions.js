import { useCallback, useEffect, useRef, useState } from "react";
import { getCustomerOptionsApi } from "../api/customer";
import { normalizeM2OOptions } from "../utils/m2oFieldOptions";

export default function useJobTitleOptions() {
  const [jobTitleOptions, setJobTitleOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qJobTitle, setQJobTitle] = useState("");
  const requestIdRef = useRef(0);

  const loadOptions = useCallback(async ({ q_job_title, page = 1, page_size = 50 } = {}) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const result = await getCustomerOptionsApi({ q_job_title, page, page_size });
      if (requestId !== requestIdRef.current) return;
      setJobTitleOptions(normalizeM2OOptions(result.job_title_options));
    } catch (e) {
      if (requestId === requestIdRef.current) {
        console.error("Failed to load job title options:", e);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOptions({ q_job_title: qJobTitle });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [qJobTitle, loadOptions]);

  /** Load options on dropdown focus (and whenever search text changes). */
  const openOptions = useCallback(
    (search = "") => {
      const q = search != null ? String(search).trim() : "";
      setQJobTitle(q);
      return loadOptions({ q_job_title: q, page: 1, page_size: 50 });
    },
    [loadOptions]
  );

  return {
    jobTitleOptions,
    isLoading,
    qJobTitle,
    setQJobTitle,
    reloadOptions: loadOptions,
    openOptions,
  };
}
