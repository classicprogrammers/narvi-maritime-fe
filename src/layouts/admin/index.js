// Chakra imports
import { Box, useDisclosure } from "@chakra-ui/react";
import Footer from "components/footer/FooterAdmin.js";
// Layout components
import Navbar from "components/navbar/NavbarAdmin.js";
import Sidebar from "components/sidebar/Sidebar.js";
import { SidebarContext } from "contexts/SidebarContext";
import React, { useState, useEffect, useMemo } from "react";
import { Redirect, Route, Switch, useHistory } from "react-router-dom";
import routes, { hiddenRoutes, getFilteredRoutes } from "routes.js";
// API Modal component
import { useUser } from "redux/hooks/useUser";
import ApiModal from "components/ApiModal";

// Custom Chakra theme
export default function Dashboard(props) {
  const { ...rest } = props;
  // states and functions
  const [fixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const history = useHistory();
  const { user, checkAuth } = useUser();
  
  // Check auth on mount to ensure user data is loaded from localStorage
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // Filter routes based on user type - use useMemo to recalculate when user changes
  const filteredRoutes = useMemo(() => {
    const userType = user?.user_type || "user";
    return getFilteredRoutes(userType);
  }, [user?.user_type]);
  // functions for changing the states from components
  const getRoute = () => {
    return window.location.pathname !== "/admin/full-screen-maps";
  };
  const getActiveRoute = (routes) => {
    let activeRoute = "Dashboard";
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveRoute = getActiveRoute(routes[i].items);
        if (collapseActiveRoute !== activeRoute) {
          return collapseActiveRoute;
        }
      } else if (routes[i].category) {
        let categoryActiveRoute = getActiveRoute(routes[i].items);
        if (categoryActiveRoute !== activeRoute) {
          return categoryActiveRoute;
        }
      } else if (routes[i].submenu) {
        for (let j = 0; j < routes[i].submenu.length; j++) {
          if (
            window.location.href.indexOf(
              routes[i].layout + routes[i].submenu[j].path
            ) !== -1
          ) {
            return routes[i].submenu[j].name;
          }
        }
      } else {
        if (
          window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
        ) {
          return routes[i].name;
        }
      }
    }
    return activeRoute;
  };
  const getActiveNavbar = (routes) => {
    let activeNavbar = false;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveNavbar = getActiveNavbar(routes[i].items);
        if (collapseActiveNavbar !== activeNavbar) {
          return collapseActiveNavbar;
        }
      } else if (routes[i].category) {
        let categoryActiveNavbar = getActiveNavbar(routes[i].items);
        if (categoryActiveNavbar !== activeNavbar) {
          return categoryActiveNavbar;
        }
      } else if (routes[i].submenu) {
        for (let j = 0; j < routes[i].submenu.length; j++) {
          if (
            window.location.href.indexOf(
              routes[i].layout + routes[i].submenu[j].path
            ) !== -1
          ) {
            return routes[i].submenu[j].secondary;
          }
        }
      } else {
        if (
          window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
        ) {
          return routes[i].secondary;
        }
      }
    }
    return activeNavbar;
  };
  const getActiveNavbarText = (routes) => {
    let activeNavbar = false;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveNavbar = getActiveNavbarText(routes[i].items);
        if (collapseActiveNavbar !== activeNavbar) {
          return collapseActiveNavbar;
        }
      } else if (routes[i].category) {
        let categoryActiveNavbar = getActiveNavbarText(routes[i].items);
        if (categoryActiveNavbar !== activeNavbar) {
          return categoryActiveNavbar;
        }
      } else if (routes[i].submenu) {
        for (let j = 0; j < routes[i].submenu.length; j++) {
          if (
            window.location.href.indexOf(
              routes[i].layout + routes[i].submenu[j].path
            ) !== -1
          ) {
            return routes[i].submenu[j].messageNavbar;
          }
        }
      } else {
        if (
          window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
        ) {
          return routes[i].messageNavbar;
        }
      }
    }
    return activeNavbar;
  };
  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/admin" && prop.path) {
        return (
          <Route
            path={prop.layout + prop.path}
            component={prop.component}
            key={key}
            exact={prop.exact}
          />
        );
      }
      if (prop.collapse) {
        return getRoutes(prop.items);
      }
      if (prop.category) {
        return getRoutes(prop.items);
      }
      if (prop.submenu) {
        return prop.submenu.map((subItem, subKey) => (
          <Route
            path={prop.layout + subItem.path}
            component={subItem.component}
            key={`${key}-${subKey}`}
            exact={subItem.exact}
          />
        ));
      } else {
        return null;
      }
    });
  };
  document.documentElement.dir = "ltr";
  const { onOpen } = useDisclosure();
  document.documentElement.dir = "ltr";
  return (
    <Box>
      <Box>
        <SidebarContext.Provider
          value={{
            toggleSidebar,
            setToggleSidebar,
            isSidebarHovered,
            setIsSidebarHovered,
          }}
        >
          <Sidebar
            routes={filteredRoutes}
            display="none"
            onHoverChange={setIsSidebarHovered}
            {...rest}
          />
          <Box
            float="right"
            minHeight="100vh"
            height="100%"
            overflow="auto"
            position="relative"
            maxHeight="100%"
            w={{
              base: "100%",
              xl:
                toggleSidebar || isSidebarHovered
                  ? "calc( 100% - 290px )"
                  : "calc( 100% - 80px )",
            }}
            maxWidth={{
              base: "100%",
              xl:
                toggleSidebar || isSidebarHovered
                  ? "calc( 100% - 290px )"
                  : "calc( 100% - 80px )",
            }}
            ml={{
              base: "0px",
              xl: toggleSidebar || isSidebarHovered ? "290px" : "80px",
            }}
            pr={{ base: "0px", xl: "20px" }}
            pl={{ base: "0px", xl: "20px" }}
            transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
            transitionDuration=".2s, .2s, .35s"
            transitionProperty="top, bottom, width, margin-left"
            transitionTimingFunction="linear, linear, ease"
          >
            <Box position="relative" zIndex="1001">
              <Navbar
                onOpen={onOpen}
                logoText={"Narvi Maritime"}
                brandText={getActiveRoute(routes)}
                secondary={getActiveNavbar(routes)}
                message={getActiveNavbarText(routes)}
                fixed={fixed}
                toggleSidebar={toggleSidebar}
                isSidebarHovered={isSidebarHovered}
                {...rest}
              />
            </Box>

            {getRoute() ? (
              <Box
                mx="auto"
                p={{ base: "20px", md: "30px" }}
                pe="20px"
                minH="100vh"
                pt="50px"
                position="relative"
                zIndex="1000"
                pl={{ base: "20px", xl: "0px" }}
                pr={{ base: "20px", xl: "40px" }}
                pb="40px"
              >
                <Switch>
                  {getRoutes(filteredRoutes)}
                  {getRoutes(hiddenRoutes)}
                  <Redirect from="/" to="/admin/default" />
                </Switch>
              </Box>
            ) : null}
            <Box>
              <Footer />
            </Box>
          </Box>
        </SidebarContext.Provider>
      </Box>

      {/* Global API Modal */}
      <ApiModal />
    </Box>
  );
}
