import React from "react";
import { Box, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { useHistory, useLocation } from "react-router-dom";
import SoNumberTab from "./SoNumberTab";
import MsoTab from "./MsoTab";

const TAB_KEYS = ["so", "mso"];

export default function ShippingOrder() {
    const history = useHistory();
    const location = useLocation();
    const tabIndex = Math.max(0, TAB_KEYS.indexOf(new URLSearchParams(location.search).get("tab")));

    const handleTabChange = (index) => {
        const params = new URLSearchParams(location.search);
        if (TAB_KEYS[index] === "so") params.delete("tab");
        else params.set("tab", TAB_KEYS[index]);
        const query = params.toString();
        history.replace(`${location.pathname}${query ? `?${query}` : ""}`);
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <Tabs variant="enclosed" colorScheme="blue" index={tabIndex} onChange={handleTabChange} isLazy>
                <TabList>
                    <Tab fontWeight="semibold">Shipping Orders</Tab>
                    <Tab fontWeight="semibold">MSO</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel px={0} pt={4}>
                        <SoNumberTab />
                    </TabPanel>
                    <TabPanel px={0} pt={4}>
                        <MsoTab />
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Box>
    );
}
