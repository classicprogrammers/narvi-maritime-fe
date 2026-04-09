import React, { useState } from "react";
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
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { Redirect, Route, Switch, useHistory, useLocation } from "react-router-dom";
import {
  MdCheckCircle,
  MdDashboard,
  MdDirectionsBoat,
  MdInventory,
  MdKeyboardArrowDown,
  MdLocationOn,
  MdLogout,
  MdWorkOutline,
} from "react-icons/md";
import { useUser } from "redux/hooks/useUser";

import ClientDashboard from "views/client/dashboard";
import ClientStock from "views/client/stock";
import ClientCompletedJobs from "views/client/jobs/completed";
import ClientOngoingJobs from "views/client/jobs/ongoing";
import ClientHubLocations from "views/client/hub-locations";
import ClientVessels from "views/client/vessels";

const clientTabs = [
  { label: "Dashboard", path: "/Client/Dashboard", icon: MdDashboard },
  { label: "Stock Report", path: "/Client/Stock", icon: MdInventory },
  { label: "Jobs", path: "/Client/Jobs", icon: MdWorkOutline },
  { label: "Vessels", path: "/Client/Vessels", icon: MdDirectionsBoat },
  { label: "Hub Locations", path: "/Client/Hub-Locations", icon: MdLocationOn },
];

function ClientLayout() {
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useUser();
  const [jobsMenuOpen, setJobsMenuOpen] = useState(false);

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
              const isJobs = tab.path === "/Client/Jobs";
              return (
                <Box
                  key={tab.label}
                  position="relative"
                  onMouseEnter={() => isJobs && setJobsMenuOpen(true)}
                  onMouseLeave={() => isJobs && setJobsMenuOpen(false)}
                >
                  <Tab
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
                    onClick={() =>
                      history.push(isJobs ? "/Client/Jobs/Ongoing" : tab.path)
                    }
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
                      {isJobs ? <Icon as={MdKeyboardArrowDown} fontSize="16px" /> : null}
                    </HStack>
                  </Tab>

                  {isJobs && jobsMenuOpen ? (
                    <Box
                      position="absolute"
                      top="44px"
                      left="0"
                      zIndex="1200"
                      minW="190px"
                      p={2}
                      borderRadius="12px"
                      bg="white"
                      border="1px solid"
                      borderColor={borderColor}
                      boxShadow="0 14px 30px rgba(112, 144, 176, 0.2)"
                    >
                      <VStack spacing={1} align="stretch">
                        <Button
                          justifyContent="flex-start"
                          variant="ghost"
                          leftIcon={<Icon as={MdWorkOutline} />}
                          fontSize="sm"
                          onClick={() => history.push("/Client/Jobs/Ongoing")}
                        >
                          Ongoing Jobs
                        </Button>
                        <Button
                          justifyContent="flex-start"
                          variant="ghost"
                          leftIcon={<Icon as={MdCheckCircle} />}
                          fontSize="sm"
                          onClick={() => history.push("/Client/Jobs/Completed")}
                        >
                          Completed Jobs
                        </Button>
                      </VStack>
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </TabList>
        </Tabs>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={6}>
        <Switch>
          <Route exact path="/Client/Dashboard" component={ClientDashboard} />
          <Route exact path="/Client/Stock" component={ClientStock} />
          <Route exact path="/Client/Jobs/Ongoing" component={ClientOngoingJobs} />
          <Route exact path="/Client/Jobs/Completed" component={ClientCompletedJobs} />
          <Redirect exact from="/Client/Jobs" to="/Client/Jobs/Ongoing" />
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
