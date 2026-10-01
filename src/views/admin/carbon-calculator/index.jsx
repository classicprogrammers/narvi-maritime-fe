import React from "react";
import { Box, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import CarbonEmission from "./carbon-emission";
import ShippingOrderEmissions from "./shipping-order-emissions";

export default function CarbonCalculator() {
  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} pb="40px" px={{ base: 4, lg: 6 }}>
      <Tabs variant="enclosed" colorScheme="blue" isLazy>
        <TabList>
          <Tab fontWeight="semibold">Calculator</Tab>
          <Tab fontWeight="semibold">Shipping order emissions</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} pt={6}>
            <CarbonEmission />
          </TabPanel>
          <TabPanel px={0} pt={6}>
            <ShippingOrderEmissions />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
