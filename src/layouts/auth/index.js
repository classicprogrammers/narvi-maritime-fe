import React, { useState, useEffect } from "react";
import { Redirect, Route, Switch, useHistory } from "react-router-dom";
import routes from "routes.js";

// Chakra imports
import { Box, useColorModeValue } from "@chakra-ui/react";

// Layout components
import { SidebarContext } from "contexts/SidebarContext";
// API Modal component
import ApiModal from "components/ApiModal";
// Redux
import { useUser } from "redux/hooks/useUser";

// Custom Chakra theme
export default function Auth() {
  // states and functions
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const { isAuthenticated, token } = useUser();
  const history = useHistory();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated && token) {
      history.push("/admin/default");
    }
  }, [isAuthenticated, token, history]);

  // functions for changing the states from components
  const getRoute = () => {
    return window.location.pathname !== "/auth/full-screen-maps";
  };
  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/auth") {
        return (
          <Route
            path={prop.layout + prop.path}
            component={prop.component}
            key={key}
          />
        );
      }
      if (prop.collapse) {
        return getRoutes(prop.items);
      }
      if (prop.category) {
        return getRoutes(prop.items);
      } else {
        return null;
      }
    });
  };
  const authBg = useColorModeValue("white", "navy.900");
  document.documentElement.dir = "ltr";

  // Don't render auth pages if user is authenticated
  if (isAuthenticated && token) {
    return null;
  }

  return (
    <Box>
      <SidebarContext.Provider
        value={{
          toggleSidebar,
          setToggleSidebar,
        }}
      >
        <Box
          bg={authBg}
          float="right"
          minHeight="100vh"
          height="100%"
          position="relative"
          w="100%"
          transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
          transitionDuration=".2s, .2s, .35s"
          transitionProperty="top, bottom, width"
          transitionTimingFunction="linear, linear, ease"
        >
          {getRoute() ? (
            <Box mx="auto" minH="100vh">
              <Switch>
                {getRoutes(routes)}
                <Redirect exact from="/auth" to="/auth/sign-in" />
              </Switch>
            </Box>
          ) : null}
        </Box>
      </SidebarContext.Provider>

      {/* Global API Modal */}
      <ApiModal />
    </Box>
  );
}
