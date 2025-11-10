import React, { useEffect, useMemo } from "react";
import { Box, VStack } from "@chakra-ui/react";
import VendorsTable from "views/admin/contacts/components/VendorsTable";
import { columnsDataAgents } from "views/admin/contacts/variables/columnsData";
import { useVendor } from "redux/hooks/useVendor";

export default function Vendors() {
  const { vendors, isLoading, getVendors } = useVendor();

  const topLevelAgents = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    return vendors.filter((agent) => {
      const parentValue = agent?.parent_id ?? agent?.parentId ?? agent?.parent;
      return (
        parentValue === false ||
        parentValue === null ||
        parentValue === undefined ||
        parentValue === ""
      );
    });
  }, [vendors]);

  useEffect(() => {
    getVendors();
  }, [getVendors]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <VendorsTable
          columnsData={columnsDataAgents}
          tableData={topLevelAgents}
          isLoading={isLoading}
        />
      </VStack>
    </Box>
  );
}
