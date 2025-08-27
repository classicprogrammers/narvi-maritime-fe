import React, { useEffect } from "react";
import { useUser } from "../redux/hooks/useUser";

const AppWrapper = ({ children }) => {
  const { checkAuth } = useUser();

  useEffect(() => {
    // Check authentication status when app starts
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
};

export default AppWrapper;
