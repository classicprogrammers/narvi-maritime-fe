import React, { useEffect, useState, useRef } from "react";
import { Route, useHistory } from "react-router-dom";
import { useUser } from "../redux/hooks/useUser";
import { Spinner, Center } from "@chakra-ui/react";
import { isClientUserType, isStaffUserType } from "../utils/userType";
import {
  AUTH_CONTEXTS,
  getAuthContextFromPath,
  getStoredAuth,
} from "../utils/authStorage";

const hasValidSession = (context, auth) => {
  if (!auth?.token || !auth?.user?.id) return false;
  if (context === AUTH_CONTEXTS.CLIENT) {
    return isClientUserType(auth.user.user_type);
  }
  return isStaffUserType(auth.user.user_type);
};

const ProtectedRoute = ({
  component: Component,
  redirectPath = "/auth/sign-in",
  ...rest
}) => {
  const history = useHistory();
  const { checkAuth } = useUser();
  const [isChecking, setIsChecking] = useState(true);
  const hasCheckedRef = useRef(false);
  const requiredContext = getAuthContextFromPath(rest.path);

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

    const storedAuth = getStoredAuth(requiredContext);
    if (!hasValidSession(requiredContext, storedAuth)) {
      history.push(redirectPath);
    }
  }, [history, isChecking, redirectPath, requiredContext]);

  if (isChecking) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  const storedAuth = getStoredAuth(requiredContext);
  if (!hasValidSession(requiredContext, storedAuth)) {
    return null;
  }

  return <Route {...rest} render={(props) => <Component {...props} />} />;
};

export default ProtectedRoute;
