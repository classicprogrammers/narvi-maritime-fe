import React, { useEffect } from "react";
import { Box, VStack } from "@chakra-ui/react";
import VendorsTable from "views/admin/contacts/components/VendorsTable";
import { columnsDataAgents } from "views/admin/contacts/variables/columnsData";
import { useVendor } from "redux/hooks/useVendor";

export default function Vendors() {
  const { vendors, isLoading, getVendors } = useVendor();

  // Load vendors on component mount
  useEffect(() => {
    getVendors();
  }, [getVendors]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <VendorsTable
          columnsData={columnsDataAgents}
          tableData={Array.isArray(vendors) ? vendors : []}
          isLoading={isLoading}
        />
      </VStack>
    </Box>
  );
}
