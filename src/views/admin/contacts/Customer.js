import React from "react";
import { Box, SimpleGrid } from "@chakra-ui/react";
import CustomerTable from "views/admin/contacts/components/CustomerTable";
import { columnsDataCustomer } from "views/admin/contacts/variables/columnsData";
import tableDataCustomer from "views/admin/contacts/variables/tableDataCustomer.json";

export default function Customer() {
  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <SimpleGrid
        mb='20px'
        columns={{ sm: 1, md: 1 }}
        spacing={{ base: "20px", xl: "20px" }}>
        <CustomerTable
          columnsData={columnsDataCustomer}
          tableData={tableDataCustomer}
        />
      </SimpleGrid>
    </Box>
  );
} 