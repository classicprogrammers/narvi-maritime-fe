import React from "react";
import { Box } from "@chakra-ui/react";
import SoNumberTab from "../stock-list/SoNumberTab";

export default function ShippingOrder() {
    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <SoNumberTab />
        </Box>
    );
} 
