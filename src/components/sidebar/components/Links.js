/* eslint-disable */
import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
// chakra imports
import {
  Box,
  Flex,
  HStack,
  Text,
  useColorModeValue,
  Collapse,
  IconButton,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";

export function SidebarLinks(props) {
  //   Chakra color mode
  let location = useLocation();
  let activeColor = useColorModeValue("gray.700", "white");
  let inactiveColor = useColorModeValue(
    "secondaryGray.600",
    "secondaryGray.600"
  );
  let activeIcon = useColorModeValue("#174693", "white");
  let textColor = useColorModeValue("secondaryGray.500", "white");
  let brandColor = useColorModeValue("#174693", "#174693");

  const { routes, collapsed = false } = props;
  const [openSubmenus, setOpenSubmenus] = useState({});

  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName) => {
    return location.pathname.includes(routeName);
  };

  // Toggle submenu open/closed state
  const toggleSubmenu = (routeName) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [routeName]: !prev[routeName],
    }));
  };

  // this function creates the links from the secondary accordions (for example auth -> sign-in -> default)
  const createLinks = (routes) => {
    return routes.map((route, index) => {
      // Skip hidden routes
      if (route.hidden) {
        return null;
      }

      if (route.category) {
        return (
          <>
            {!collapsed && (
              <Text
                fontSize={"md"}
                color={activeColor}
                fontWeight="bold"
                mx="auto"
                ps={{
                  sm: "10px",
                  xl: "16px",
                }}
                pt="18px"
                pb="12px"
                key={index}
              >
                {route.name}
              </Text>
            )}
            {createLinks(route.items)}
          </>
        );
      } else if (
        route.layout === "/admin" ||
        route.layout === "/auth" ||
        route.layout === "/rtl"
      ) {
        // Check if route has submenu
        const hasSubmenu = route.submenu && route.submenu.length > 0;
        const isSubmenuOpen = openSubmenus[route.name] || false;

        return (
          <Box key={index}>
            {hasSubmenu ? (
              // Route with submenu
              <Box>
                <Flex
                  alignItems="center"
                  justifyContent={collapsed ? "center" : "space-between"}
                  py="5px"
                  ps={collapsed ? "0px" : "10px"}
                  cursor="pointer"
                  onClick={() => toggleSubmenu(route.name)}
                  _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
                  borderRadius="md"
                >
                  <HStack spacing={collapsed ? "0px" : "26px"}>
                    <Flex w="100%" alignItems="center" justifyContent="center">
                      <Box color={textColor} me={collapsed ? "0px" : "18px"}>
                        {route.icon}
                      </Box>
                      {!collapsed && (
                        <Text me="auto" color={textColor} fontWeight="normal">
                          {route.name}
                        </Text>
                      )}
                    </Flex>
                  </HStack>
                  {!collapsed && (
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={
                        isSubmenuOpen ? (
                          <ChevronDownIcon />
                        ) : (
                          <ChevronRightIcon />
                        )
                      }
                      aria-label="Toggle submenu"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubmenu(route.name);
                      }}
                    />
                  )}
                </Flex>

                {!collapsed && (
                  <Collapse in={isSubmenuOpen} animateOpacity>
                    <Box pl="20px">
                      {route.submenu.map((subItem, subIndex) => (
                        <NavLink
                          key={subIndex}
                          to={route.layout + subItem.path}
                        >
                          <Box>
                            <HStack
                              spacing={
                                activeRoute(subItem.path.toLowerCase())
                                  ? "22px"
                                  : "26px"
                              }
                              py="5px"
                              ps="10px"
                            >
                              <Flex
                                w="100%"
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Box
                                  color={
                                    activeRoute(subItem.path.toLowerCase())
                                      ? activeIcon
                                      : textColor
                                  }
                                  me="18px"
                                >
                                  {subItem.icon}
                                </Box>
                                <Text
                                  me="auto"
                                  color={
                                    activeRoute(subItem.path.toLowerCase())
                                      ? activeColor
                                      : textColor
                                  }
                                  fontWeight={
                                    activeRoute(subItem.path.toLowerCase())
                                      ? "bold"
                                      : "normal"
                                  }
                                >
                                  {subItem.name}
                                </Text>
                              </Flex>
                              <Box
                                h="36px"
                                w="4px"
                                bg={
                                  activeRoute(subItem.path.toLowerCase())
                                    ? brandColor
                                    : "transparent"
                                }
                                borderRadius="5px"
                              />
                            </HStack>
                          </Box>
                        </NavLink>
                      ))}
                    </Box>
                  </Collapse>
                )}
              </Box>
            ) : (
              // Regular route without submenu
              <NavLink to={route.layout + route.path}>
                {route.icon ? (
                  <Box>
                    <HStack
                      spacing={
                        activeRoute(route.path.toLowerCase()) ? "22px" : "26px"
                      }
                      py="5px"
                      ps={collapsed ? "0px" : "10px"}
                    >
                      <Flex
                        w="100%"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Box
                          color={
                            activeRoute(route.path.toLowerCase())
                              ? activeIcon
                              : textColor
                          }
                          me={collapsed ? "0px" : "18px"}
                        >
                          {route.icon}
                        </Box>
                        {!collapsed && (
                          <Text
                            me="auto"
                            color={
                              activeRoute(route.path.toLowerCase())
                                ? activeColor
                                : textColor
                            }
                            fontWeight={
                              activeRoute(route.path.toLowerCase())
                                ? "bold"
                                : "normal"
                            }
                          >
                            {route.name}
                          </Text>
                        )}
                      </Flex>
                      {!collapsed && (
                        <Box
                          h="36px"
                          w="4px"
                          bg={
                            activeRoute(route.path.toLowerCase())
                              ? brandColor
                              : "transparent"
                          }
                          borderRadius="5px"
                        />
                      )}
                    </HStack>
                  </Box>
                ) : (
                  <Box>
                    <HStack
                      spacing={
                        activeRoute(route.path.toLowerCase()) ? "22px" : "26px"
                      }
                      py="5px"
                      ps="10px"
                    >
                      <Text
                        me="auto"
                        color={
                          activeRoute(route.path.toLowerCase())
                            ? activeColor
                            : inactiveColor
                        }
                        fontWeight={
                          activeRoute(route.path.toLowerCase())
                            ? "bold"
                            : "normal"
                        }
                      >
                        {route.name}
                      </Text>
                      <Box h="36px" w="4px" bg="#174693" borderRadius="5px" />
                    </HStack>
                  </Box>
                )}
              </NavLink>
            )}
          </Box>
        );
      }
    });
  };
  //  BRAND
  return createLinks(routes);
}

export default SidebarLinks;
