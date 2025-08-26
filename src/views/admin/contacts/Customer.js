import React, { useEffect } from "react";
import { Box, VStack } from "@chakra-ui/react";
import CustomerTable from "views/admin/contacts/components/CustomerTable";
import { columnsDataCustomer } from "views/admin/contacts/variables/columnsData";
import { useCustomer } from "redux/hooks/useCustomer";

export default function Customer() {
  const { customers, isLoading, getCustomers } = useCustomer();

  // Load customers on component mount
  useEffect(() => {
    getCustomers();
  }, [getCustomers]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <CustomerTable
          columnsData={columnsDataCustomer}
          tableData={customers || []}
          isLoading={isLoading}
        />
      </VStack>
    </Box>
  );
}
