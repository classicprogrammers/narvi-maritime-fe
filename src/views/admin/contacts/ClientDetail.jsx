import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Input,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { useHistory, useLocation, useParams } from "react-router-dom";

import Card from "components/card/Card";
import { useCustomer } from "redux/hooks/useCustomer";
import { createCustomerPersonApi } from "../../../api/customer";

const prettyValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return value;
};

const clientInfoSections = [
  {
    heading: "Look up",
    items: [
      { label: "Company name", key: "name" },
      { label: "Address1", key: "street" },
      { label: "Address2", key: "street2" },
      { label: "Postcode + City", key: "city", formatter: (value, client) => `${client.zip || "-"} ${value || ""}`.trim() || "-" },
      { label: "Country", key: "country_name" },
      { label: "Reg No", key: "reg_no" },
      { label: "Category", key: "client_category" },
      { label: "Email1", key: "email" },
      { label: "Email2", key: "email2" },
      { label: "Phone1", key: "phone" },
      { label: "Phone2", key: "phone2" },
      { label: "Website", key: "website" },
      { label: "Remarks", key: "remarks" },
    ],
  },
];

const peopleTableColumns = [
  { key: "company_name", label: "Client company" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "prefix", label: "Prefix" },
  { key: "job_title", label: "Job title" },
  { key: "email", label: "E-mail" },
  { key: "tel_direct", label: "Tel direct" },
  { key: "phone", label: "Mobile" },
  { key: "tel_other", label: "Tel other" },
  { key: "linked_in", label: "LinkedIn" },
  { key: "remarks", label: "Remark" },
];

const emptyPersonRow = {
  company_name: "",
  first_name: "",
  last_name: "",
  prefix: "",
  job_title: "",
  email: "",
  tel_direct: "",
  phone: "",
  tel_other: "",
  linked_in: "",
  remarks: "",
};

const ClientDetail = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { customers = [], isLoading } = useCustomer();
  const [peopleRows, setPeopleRows] = useState([]);
  const toast = useToast();

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("secondaryGray.900", "white");
  const sectionHeadingBg = useColorModeValue("orange.50", "orange.700");
  const labelColor = useColorModeValue("gray.600", "gray.300");
  const valueColor = useColorModeValue("gray.800", "white");
  const rowEvenBg = useColorModeValue("gray.50", "gray.700");

  const client = useMemo(() => {
    if (location.state?.client) {
      return location.state.client;
    }

    const list = Array.isArray(customers)
      ? customers
      : Array.isArray(customers?.customers)
        ? customers.customers
        : [];

    return list.find((item) => String(item.id) === String(id));
  }, [customers, id, location.state]);

  const isBusy = isLoading;

  const handleAddPersonRow = () => {
    const required = ["first_name", "last_name", "email"];
    const hasIncomplete = peopleRows.some((row) =>
      required.some((field) => !String(row[field] || "").trim())
    );

    if (hasIncomplete) {
      toast({
        title: "Complete current row(s) first",
        description: "Please fill First name, Last name and Email before adding another.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setPeopleRows((prev) => [
      ...prev,
      { ...emptyPersonRow, company_name: client?.name || "" },
    ]);
  };

  const handlePersonFieldChange = (index, field) => (event) => {
    const value = event.target.value;
    setPeopleRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleSubmitPeople = async () => {
    const required = ["first_name", "last_name", "email"];
    const hasIncomplete = peopleRows.some((row) =>
      required.some((field) => !String(row[field] || "").trim())
    );

    if (hasIncomplete) {
      toast({
        title: "Incomplete rows",
        description: "Please complete required fields (First, Last, Email) on all rows.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!client?.id) {
      toast({
        title: "Client not found",
        description: "Cannot submit people without a valid client.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      // Submit each row; keep it simple and sequential for clarity
      for (const row of peopleRows) {
        await createCustomerPersonApi(client.id, row);
      }

      toast({
        title: "Client people saved",
        description: "All rows were submitted successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Clear table after successful submission
      setPeopleRows([]);
    } catch (error) {
      // Error modal is already shown by the API layer; add a toast for context
      toast({
        title: "Failed to save some rows",
        description: error.message || "Please try again.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const requiredFields = ["first_name", "last_name", "email"];
  const isAddDisabled = peopleRows.some((row) =>
    requiredFields.some((field) => !String(row[field] || "").trim())
  );

  const placeholders = {
    first_name: "e.g. John",
    last_name: "e.g. Doe",
    prefix: "e.g. Mr/Ms",
    job_title: "e.g. Ops Manager",
    email: "e.g. john@company.com",
    tel_direct: "e.g. +65 1234 5678",
    phone: "e.g. +65 9123 4567",
    tel_other: "e.g. +65 1111 2222",
    linked_in: "https://linkedin.com/in/...",
    remarks: "Notes...",
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Heading size="lg" color={headingColor}>
          Client Details
        </Heading>
        <Button onClick={() => history.push("/admin/contacts/customer")}>Back to Clients</Button>
      </Flex>

      <Card p={{ base: 4, md: 6 }} bg={cardBg} border="1px" borderColor={borderColor} mb={8}>
        {isBusy && !client ? (
          <Text color={labelColor}>Loading client information...</Text>
        ) : !client ? (
          <Text color={labelColor}>Client not found.</Text>
        ) : (
          <Stack spacing={10}>
            <Grid templateColumns={{ base: "1fr", lg: "1fr" }} gap={6}>
              <Text fontWeight="700" textTransform="uppercase" color={headingColor}>
                Look up
              </Text>
              {clientInfoSections.map((section) => (
                <GridItem key={section.heading} border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={0}>
                    {section.items.map(({ label, key, formatter }, idx) => {
                      const rawValue = formatter ? formatter(client[key], client) : client[key];
                      const addRightBorder = idx % 2 === 0; // first column cells
                      return (
                        <GridItem
                          key={key}
                          px={4}
                          py={2}
                          borderColor={borderColor}
                          borderRight={{ base: "none", md: addRightBorder ? `1px solid ${borderColor}` : "none" }}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          gap={2}
                        >
                          <Text fontSize="xs" fontWeight="600" color={labelColor} textTransform="uppercase">
                            {label}
                          </Text>
                          <Text fontSize="sm" color={valueColor} whiteSpace="pre-wrap">
                            {prettyValue(rawValue)}
                          </Text>
                        </GridItem>
                      );
                    })}
                  </Grid>
                </GridItem>
              ))}
            </Grid>

            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color={headingColor}>
                  Client People
                </Heading>
                <Button colorScheme="blue" onClick={handleAddPersonRow} isDisabled={isAddDisabled}>
                  Add Client Person
                </Button>
              </Flex>

              <Box border="1px solid" borderColor={borderColor} borderRadius="lg" overflow="auto" bg={cardBg} boxShadow="sm">
                <Table size="sm" sx={{ tableLayout: "auto" }}>
                  <Thead bg={sectionHeadingBg} position="sticky" top={0} zIndex={1}>
                    <Tr>
                      {peopleTableColumns.map((column) => (
                        <Th key={column.key} fontSize="xs" minW="170px" textTransform="uppercase" color={headingColor}>
                          {column.label}
                        </Th>
                      ))}
                      <Th fontSize="xs" textTransform="uppercase" color={headingColor} w="80px">
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {peopleRows.length === 0 ? (
                      <Tr>
                        <Td colSpan={peopleTableColumns.length} textAlign="center" py={8}>
                          <Text color={labelColor}>No client people added yet.</Text>
                        </Td>
                      </Tr>
                    ) : (
                      peopleRows.map((row, rowIndex) => (
                        <Tr key={rowIndex} bg={rowIndex % 2 === 0 ? rowEvenBg : "transparent"}>
                          {peopleTableColumns.map((column) => (
                            <Td key={column.key} minW="170px" px={3} py={2}>
                              <Input
                                value={row[column.key]}
                                onChange={handlePersonFieldChange(rowIndex, column.key)}
                                size="sm"
                                isRequired={["first_name", "last_name", "email"].includes(column.key)}
                                isReadOnly={column.key === "company_name"}
                                isDisabled={column.key === "company_name"}
                                style={{ backgroundColor: "#f7f7f77a" }}
                                border="1px solid"
                                borderColor={borderColor}
                                borderRadius="md"
                                _focus={{
                                  borderColor: "blue.500",
                                  boxShadow: "0 0 0 1px rgba(0, 123, 255, 0.2)",
                                }}
                                placeholder={placeholders[column.key]}
                              />
                            </Td>
                          ))}
                          <Td px={3} py={2}>
                            <IconButton
                              aria-label="Delete row"
                              icon={<DeleteIcon />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() =>
                                setPeopleRows((prev) => prev.filter((_, idx) => idx !== rowIndex))
                              }
                            />
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>

              <Flex justify="flex-end" mt={4}>
                <Button colorScheme="green" onClick={handleSubmitPeople} isDisabled={peopleRows.length === 0 || isAddDisabled}>
                  Submit
                </Button>
              </Flex>
            </Box>
          </Stack>
        )}
      </Card>
    </Box>
  );
};

export default ClientDetail;
