import React, { useEffect, useState } from "react";
import { Route, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import { useUser } from "../redux/hooks/useUser";
import { Box, Spinner, Center } from "@chakra-ui/react";

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const history = useHistory();
  const { isAuthenticated, token, checkAuth } = useUser();
  const [isChecking, setIsChecking] = useState(true);
  const userState = useSelector((state) => state.user);

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuthentication = async () => {
      await checkAuth();
      setIsChecking(false);
    };

    checkAuthentication();
  }, [checkAuth]);

  useEffect(() => {
    // If not authenticated and no token, redirect to login
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

  // Show loading or redirect if not authenticated
  if (!isAuthenticated || !token) {
    return null; // This will trigger the redirect in useEffect
  }

  return <Route {...rest} render={(props) => <Component {...props} />} />;
};

export default ProtectedRoute;
