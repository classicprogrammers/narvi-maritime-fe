import React from "react";
import { Box, Flex, Text, Button, Input, InputGroup, InputLeftElement, Select, HStack, VStack, Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton, useColorModeValue, Icon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, FormControl, FormLabel, useDisclosure, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay } from "@chakra-ui/react";
import { MdSearch, MdAdd, MdEdit, MdDelete, MdCheckCircle, MdCancel, MdVisibility } from "react-icons/md";
import CustomerTable from "views/admin/contacts/components/CustomerTable";
import { columnsDataCustomer } from "views/admin/contacts/variables/columnsData";
import tableDataCustomer from "views/admin/contacts/variables/tableDataCustomer.json";

export default function Customer() {
  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <CustomerTable
          columnsData={columnsDataCustomer}
          tableData={tableDataCustomer}
        />
      </VStack>
    </Box>
  );
} 