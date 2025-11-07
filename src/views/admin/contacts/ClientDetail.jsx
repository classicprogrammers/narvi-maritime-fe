import React, { useMemo } from "react";
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
  Icon,
} from "@chakra-ui/react";
import { MdPrint } from "react-icons/md";
import { useHistory, useLocation, useParams } from "react-router-dom";

import Card from "components/card/Card";
import { useCustomer } from "redux/hooks/useCustomer";

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

const ClientDetail = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { customers = [], isLoading } = useCustomer();

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

  // Get client people from children array
  const clientPeople = useMemo(() => {
    if (!client || !Array.isArray(client.children)) {
      return [];
    }

    // Helper function to convert false/null/undefined to empty string
    const getValue = (val) => (val !== false && val !== null && val !== undefined) ? String(val) : "";

    return client.children.map((child) => ({
      first_name: getValue(child.first_name),
      last_name: getValue(child.last_name),
      prefix: getValue(child.prefix),
      job_title: getValue(child.job_title),
      email: getValue(child.email),
      tel_direct: getValue(child.tel_direct),
      phone: getValue(child.phone),
      tel_other: getValue(child.tel_other),
      linked_in: getValue(child.linked_in),
      remarks: getValue(child.remarks),
    }));
  }, [client]);

  const isBusy = isLoading;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} className="print-content">
        <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
          <Heading size="lg" color={headingColor}>
            Client Details
          </Heading>
          <Flex gap={2} className="no-print">
            <Button leftIcon={<Icon as={MdPrint} />} onClick={handlePrint}>
              Print
            </Button>
            <Button onClick={() => history.push("/admin/contacts/customer")}>Back to Clients</Button>
          </Flex>
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
                <Heading size="md" color={headingColor} mb={4}>
                  Client People
                </Heading>

                <Box border="1px solid" borderColor={borderColor} borderRadius="lg" overflow="auto" bg={cardBg} boxShadow="sm">
                  <Table size="sm" sx={{ tableLayout: "auto" }}>
                    <Thead bg={sectionHeadingBg} position="sticky" top={0} zIndex={1}>
                      <Tr>
                        {peopleTableColumns.map((column) => (
                          <Th key={column.key} fontSize="xs" minW="170px" textTransform="uppercase" color={headingColor}>
                            {column.label}
                          </Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {clientPeople.length === 0 ? (
                        <Tr>
                          <Td colSpan={peopleTableColumns.length} textAlign="center" py={8}>
                            <Text color={labelColor}>No client people available.</Text>
                          </Td>
                        </Tr>
                      ) : (
                        clientPeople.map((person, rowIndex) => (
                          <Tr key={rowIndex} bg={rowIndex % 2 === 0 ? rowEvenBg : "transparent"}>
                            {peopleTableColumns.map((column) => (
                              <Td key={column.key} minW="170px" px={3} py={2}>
                                <Text fontSize="sm" color={valueColor}>
                                  {prettyValue(person[column.key])}
                                </Text>
                              </Td>
                            ))}
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </Stack>
          )}
        </Card>
      </Box>
    </>
  );
};

export default ClientDetail;
