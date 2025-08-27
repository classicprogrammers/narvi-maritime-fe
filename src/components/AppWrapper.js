import React, { useEffect, useRef } from "react";
import { useUser } from "../redux/hooks/useUser";

const AppWrapper = ({ children }) => {
  const { checkAuth } = useUser();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only check authentication status once when app starts
    if (!hasCheckedAuth.current) {
      checkAuth();
      hasCheckedAuth.current = true;
    }
  }, [checkAuth]);

  return <>{children}</>;
};

export default AppWrapper;
