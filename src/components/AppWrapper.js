import React, { useEffect, useRef } from "react";
import { useUser } from "../redux/hooks/useUser";

const AppWrapper = ({ children }) => {
  const { checkAuth } = useUser();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only check authentication status once when app starts (empty deps = run once on mount)
    if (!hasCheckedAuth.current) {
      checkAuth();
      hasCheckedAuth.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};

export default AppWrapper;
