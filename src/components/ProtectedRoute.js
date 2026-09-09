import React, { useEffect, useState, useRef } from "react";
import { Route, useHistory } from "react-router-dom";
import { useUser } from "../redux/hooks/useUser";
import { Spinner, Center } from "@chakra-ui/react";
import { isClientUserType, isStaffUserType } from "../utils/userType";

const ProtectedRoute = ({
  component: Component,
  redirectPath = "/auth/sign-in",
  ...rest
}) => {
  const history = useHistory();
  const { isAuthenticated, token, user, checkAuth } = useUser();
  const [isChecking, setIsChecking] = useState(true);
  const hasCheckedRef = useRef(false);

  // Run auth check only once on mount (ref prevents effect from re-running due to checkAuth changing)
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    try {
      checkAuth();
    } catch (error) {
      console.error("Authentication check failed:", error);
    } finally {
      setIsChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isChecking) return;

    if (!isAuthenticated && !token) {
      history.push(redirectPath);
      return;
    }

    const routePath = String(rest.path || "");
    if (routePath.startsWith("/admin") && isClientUserType(user?.user_type)) {
      history.replace("/Client/Vessels");
      return;
    }
    if (routePath.startsWith("/Client") && isStaffUserType(user?.user_type)) {
      history.replace("/admin/default");
    }
  }, [isAuthenticated, token, user, history, isChecking, redirectPath, rest.path]);

  // Show loading spinner while checking authentication
  if (isChecking) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  // // Show loading or redirect if not authenticated
  if (!isAuthenticated || !token) {
    return null; // This will trigger the redirect in useEffect
  }

  const routePath = String(rest.path || "");
  if (routePath.startsWith("/admin") && isClientUserType(user?.user_type)) {
    return null;
  }
  if (routePath.startsWith("/Client") && isStaffUserType(user?.user_type)) {
    return null;
  }

  return <Route {...rest} render={(props) => <Component {...props} />} />;
};

export default ProtectedRoute;