import React from "react";
import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Tab,
  TabList,
  Tabs,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Redirect, Route, Switch, useHistory, useLocation } from "react-router-dom";
import {
  MdDashboard,
  MdDirectionsBoat,
  MdInventory,
  MdLocalShipping,
  MdLocationOn,
  MdLogout,
} from "react-icons/md";
import { useUser } from "redux/hooks/useUser";

import ClientDashboard from "views/client/dashboard";
import ClientShippingOrders from "views/client/shipping-orders";
import ClientStock from "views/client/stock";
import ClientHubLocations from "views/client/hub-locations";
import ClientVessels from "views/client/vessels";

const clientTabs = [
  { label: "Dashboard", path: "/Client/Dashboard", icon: MdDashboard },
  { label: "Shipping Order", path: "/Client/Shipping-Orders", icon: MdLocalShipping },
  { label: "Stock Report", path: "/Client/Stock", icon: MdInventory },
  { label: "Vessels", path: "/Client/Vessels", icon: MdDirectionsBoat },
  { label: "Hub Locations", path: "/Client/Hub-Locations", icon: MdLocationOn },
];

function ClientLayout() {
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useUser();

  const bg = useColorModeValue("gray.50", "navy.900");
  const navBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const activeTabBg = useColorModeValue("brandScheme.500", "whiteAlpha.200");
  const activeTabText = useColorModeValue("white", "white");
  const tabRailBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const tabIconBg = useColorModeValue("white", "whiteAlpha.200");

  const displayName = user?.name || user?.email?.split("@")[0] || "Client User";
  const isTabActive = (tabPath) =>
    location.pathname === tabPath || location.pathname.startsWith(`${tabPath}/`);
  const activeTabIndex = Math.max(
    clientTabs.findIndex((tab) => isTabActive(tab.path)),
    0
  );

  const handleLogout = () => {
    logout();
    history.push("/Client/login");
  };

  return (
    <Box minH="100vh" bg={bg}>
      <Box
        bg={navBg}
        borderBottom="1px solid"
        borderColor={borderColor}
        px={{ base: 4, md: 6 }}
        py={3}
        position="sticky"
        top={0}
        zIndex={30}
      >
        <Flex align="center" justify="space-between" mb={3}>
          <HStack spacing={3}>
            <Avatar name={displayName} size="sm" bg="#174693" color="white" />
            <Box>
              <Text fontSize="xs" color={muted}>
                Logged in as
              </Text>
              <Text fontSize="sm" fontWeight="700" color="navy.700">
                {displayName}
              </Text>
            </Box>
          </HStack>

          <Button
            variant="ghost"
            borderRadius="12px"
            leftIcon={<Icon as={MdLogout} />}
            onClick={handleLogout}
            fontSize="sm"
            fontWeight="500"
          >
            Logout
          </Button>
        </Flex>

        <Tabs index={activeTabIndex} variant="unstyled">
          <TabList
            position="relative"
            overflowY="visible"
            whiteSpace="nowrap"
            pb={1}
            bg={tabRailBg}
            borderRadius="14px"
            p="6px"
            border="1px solid"
            borderColor={borderColor}
          >
            {clientTabs.map((tab) => {
              const isActive = isTabActive(tab.path);
              return (
                <Tab
                  key={tab.label}
                  mr={2}
                  px={4}
                  py={2.5}
                  borderRadius="12px"
                  fontWeight="600"
                  fontSize="sm"
                  color={isActive ? activeTabText : muted}
                  bg={isActive ? activeTabBg : "transparent"}
                  border="1px solid"
                  borderColor={isActive ? "brandScheme.500" : "transparent"}
                  boxShadow={isActive ? "0 10px 24px rgba(23, 70, 147, 0.24)" : "none"}
                  _hover={{
                    bg: isActive ? activeTabBg : "white",
                    color: isActive ? activeTabText : "navy.700",
                  }}
                  onClick={() => history.push(tab.path)}
                >
                  <HStack spacing={2.5}>
                    <Flex
                      w="22px"
                      h="22px"
                      borderRadius="8px"
                      align="center"
                      justify="center"
                      bg={isActive ? tabIconBg : "transparent"}
                      color={isActive ? "brand.500" : "inherit"}
                    >
                      <Icon as={tab.icon} fontSize="14px" />
                    </Flex>
                    <Text fontSize="sm" fontWeight="700">
                      {tab.label}
                    </Text>
                  </HStack>
                </Tab>
              );
            })}
          </TabList>
        </Tabs>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={6}>
        <Switch>
          <Route exact path="/Client/Dashboard" component={ClientDashboard} />
          <Route exact path="/Client/Shipping-Orders" component={ClientShippingOrders} />
          <Route exact path="/Client/Stock" component={ClientStock} />
          <Redirect from="/Client/Jobs" to="/Client/Stock" />
          <Route exact path="/Client/Vessels" component={ClientVessels} />
          <Route exact path="/Client/Hub-Locations" component={ClientHubLocations} />
          <Redirect exact from="/Client" to="/Client/Vessels" />
          <Redirect to="/Client/Vessels" />
        </Switch>
      </Box>
    </Box>
  );
}

export default ClientLayout;
