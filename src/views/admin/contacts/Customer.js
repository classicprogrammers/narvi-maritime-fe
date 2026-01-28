import React, { useEffect, useState } from "react";
import { Box, VStack } from "@chakra-ui/react";
import CustomerTable from "views/admin/contacts/components/CustomerTable";
import { columnsDataClient } from "views/admin/contacts/variables/columnsData";
import { useCustomer } from "redux/hooks/useCustomer";

export default function Customer() {
  const { customers, isLoading, getCustomers, pagination } = useCustomer();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(80);

  // Load customers when page changes
  useEffect(() => {
    getCustomers(page, pageSize);
  }, [page, pageSize, getCustomers]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <CustomerTable
          columnsData={columnsDataClient}
          tableData={customers || []}
          isLoading={isLoading}
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </VStack>
    </Box>
  );
}
