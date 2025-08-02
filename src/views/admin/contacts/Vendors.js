import React from "react";
import { Box, SimpleGrid } from "@chakra-ui/react";
import VendorsTable from "views/admin/contacts/components/VendorsTable";
import { columnsDataVendors } from "views/admin/contacts/variables/columnsData";
import tableDataVendors from "views/admin/contacts/variables/tableDataVendors.json";

export default function Vendors() {
  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <SimpleGrid
        mb='20px'
        columns={{ sm: 1, md: 1 }}
        spacing={{ base: "20px", xl: "20px" }}>
        <VendorsTable
          columnsData={columnsDataVendors}
          tableData={tableDataVendors}
        />
      </SimpleGrid>
    </Box>
  );
} 