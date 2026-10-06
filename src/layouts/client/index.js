import React from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Tab,
  TabList,
  Tabs,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Redirect, Route, Switch, useHistory, useLocation } from "react-router-dom";
import {
  MdBusiness,
  MdCheck,
  MdDashboard,
  MdDirectionsBoat,
  MdExpandMore,
  MdInventory,
  MdLocalShipping,
  MdLocationOn,
  MdLogout,
} from "react-icons/md";
import { useUser } from "redux/hooks/useUser";
import { isStagingEnvironment, STAGING_BANNER_HEIGHT } from "components/StagingBanner";
import { PortalClientProvider, usePortalClient } from "views/client/PortalClientContext";
import { clearSelectedPortalClientId } from "utils/portalClientSelection";

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

function ClientCompanySelect() {
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const textColor = useColorModeValue("navy.700", "white");
  const cardBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const cardHoverBg = useColorModeValue("white", "whiteAlpha.200");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const iconBg = useColorModeValue("white", "whiteAlpha.200");
  const menuBg = useColorModeValue("white", "navy.800");
  const selectedBg = useColorModeValue("rgba(23, 70, 147, 0.08)", "whiteAlpha.100");
  const selectedHoverBg = useColorModeValue("rgba(23, 70, 147, 0.12)", "whiteAlpha.200");
  const { clients, selectedClient, selectedClientId, loading, selectClient } = usePortalClient();

  if (loading && !clients.length) {
    return (
      <HStack
        spacing={3}
        px={3}
        py={2}
        borderRadius="14px"
        bg={cardBg}
        border="1px solid"
        borderColor={borderColor}
        minW={{ base: "100%", md: "280px" }}
      >
        <Spinner size="sm" color="#174693" />
        <Text fontSize="sm" color={muted}>
          Loading companies...
        </Text>
      </HStack>
    );
  }

  if (!clients.length || selectedClientId == null) return null;

  const canSwitch = clients.length > 1;
  const selectedCode = selectedClient?.client_code || "";

  const trigger = (
    <Flex
      as="span"
      align="center"
      gap={3}
      px={3}
      py="7px"
      minW={{ base: "100%", md: "280px" }}
      maxW={{ base: "100%", md: "420px" }}
      borderRadius="14px"
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      cursor={canSwitch ? "pointer" : "default"}
      transition="all 0.2s ease"
      _hover={canSwitch ? { bg: cardHoverBg, boxShadow: "0 10px 24px rgba(112, 144, 176, 0.16)" } : undefined}
    >
      <Flex
        w="34px"
        h="34px"
        flexShrink={0}
        borderRadius="10px"
        align="center"
        justify="center"
        bg={iconBg}
        color="#174693"
      >
        <Icon as={MdBusiness} fontSize="18px" />
      </Flex>
      <Box minW={0} flex="1" textAlign="left">
        <Text fontSize="11px" fontWeight="600" letterSpacing="0.04em" textTransform="uppercase" color={muted}>
          Company
        </Text>
        <Text fontSize="sm" fontWeight="700" color={textColor} noOfLines={1} title={selectedClient?.name}>
          {selectedClient?.name || "Select company"}
        </Text>
      </Box>
      {selectedCode ? (
        <Badge
          flexShrink={0}
          px={2}
          py={0.5}
          borderRadius="8px"
          bg="rgba(23, 70, 147, 0.1)"
          color="#174693"
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.02em"
        >
          {selectedCode}
        </Badge>
      ) : null}
      {canSwitch ? <Icon as={MdExpandMore} color={muted} fontSize="20px" flexShrink={0} /> : null}
    </Flex>
  );

  if (!canSwitch) return trigger;

  return (
    <Menu placement="bottom-end" autoSelect={false}>
      <MenuButton
        aria-label="Select company"
        variant="unstyled"
        display="block"
        h="auto"
        p={0}
        minW={0}
        w={{ base: "100%", md: "auto" }}
        boxShadow="none"
        _hover={{ bg: "transparent" }}
        _active={{ bg: "transparent" }}
        _focus={{ boxShadow: "none" }}
      >
        {trigger}
      </MenuButton>
      <MenuList
        minW={{ base: "100%", md: "360px" }}
        maxW="460px"
        maxH="320px"
        overflowY="auto"
        p={2}
        mt={2}
        borderRadius="16px"
        bg={menuBg}
        border="1px solid"
        borderColor={borderColor}
        boxShadow="0 18px 40px rgba(112, 144, 176, 0.22)"
      >
        <Text px={3} pt={1} pb={2} fontSize="11px" fontWeight="700" letterSpacing="0.04em" textTransform="uppercase" color={muted}>
          Switch company
        </Text>
        {clients.map((client) => {
          const isSelected = client.id === selectedClientId;
          return (
            <MenuItem
              key={client.id}
              onClick={() => selectClient(client.id)}
              borderRadius="12px"
              px={3}
              py={2.5}
              bg={isSelected ? selectedBg : "transparent"}
              _hover={{ bg: isSelected ? selectedHoverBg : cardBg }}
              _focus={{ bg: isSelected ? selectedHoverBg : cardBg }}
            >
              <Flex align="center" w="100%" gap={3}>
                <Box minW={0} flex="1">
                  <Text fontSize="sm" fontWeight="700" color={textColor} noOfLines={1} title={client.name}>
                    {client.name}
                  </Text>
                  {client.client_code ? (
                    <Text fontSize="xs" color={muted} noOfLines={1}>
                      {client.client_code}
                    </Text>
                  ) : null}
                </Box>
                {isSelected ? <Icon as={MdCheck} color="#174693" fontSize="18px" /> : null}
              </Flex>
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
}

function ClientLayoutShell() {
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useUser();
  const { selectedClientId, loading, error } = usePortalClient();

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
    clearSelectedPortalClientId();
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
        top={isStagingEnvironment ? STAGING_BANNER_HEIGHT : 0}
        zIndex={30}
      >
        <Flex align="center" justify="space-between" mb={3} gap={3} wrap="wrap">
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

          <Flex
            align="center"
            justify="flex-end"
            gap={3}
            flex={{ base: "1 1 100%", md: "0 1 auto" }}
            w={{ base: "100%", md: "auto" }}
          >
            <ClientCompanySelect />
            <Button
              variant="ghost"
              borderRadius="14px"
              h="48px"
              px={4}
              leftIcon={<Icon as={MdLogout} />}
              onClick={handleLogout}
              fontSize="sm"
              fontWeight="600"
              flexShrink={0}
            >
              Logout
            </Button>
          </Flex>
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
        {loading || selectedClientId == null ? (
          error ? (
            <Alert status="error" borderRadius="12px">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Flex align="center" justify="center" minH="240px">
              <Spinner color="#174693" />
            </Flex>
          )
        ) : (
          <Switch key={selectedClientId}>
            <Route exact path="/Client/Dashboard" component={ClientDashboard} />
            <Route exact path="/Client/Shipping-Orders" component={ClientShippingOrders} />
            <Route exact path="/Client/Stock" component={ClientStock} />
            <Redirect from="/Client/Jobs" to="/Client/Stock" />
            <Route exact path="/Client/Vessels" component={ClientVessels} />
            <Route exact path="/Client/Hub-Locations" component={ClientHubLocations} />
            <Redirect exact from="/Client" to="/Client/Vessels" />
            <Redirect to="/Client/Vessels" />
          </Switch>
        )}
      </Box>
    </Box>
  );
}

function ClientLayout() {
  return (
    <PortalClientProvider>
      <ClientLayoutShell />
    </PortalClientProvider>
  );
}

export default ClientLayout;
