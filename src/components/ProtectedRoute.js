import React, { useEffect, useState, useRef } from "react";
import { Route, useHistory } from "react-router-dom";
import { useUser } from "../redux/hooks/useUser";
import { Spinner, Center } from "@chakra-ui/react";

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const history = useHistory();
  const { isAuthenticated, token, checkAuth } = useUser();
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
    // If not authenticated and no token, redirect to login
    // Only run this after the initial check is complete
    if (!isChecking && !isAuthenticated && !token) {
      history.push("/auth/sign-in");
    }
  }, [isAuthenticated, token, history, isChecking]);

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

  return <Route {...rest} render={(props) => <Component {...props} />} />;
};

export default ProtectedRoute;