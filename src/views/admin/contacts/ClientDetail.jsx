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
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { MdPrint, MdContentCopy, MdEdit, MdOpenInNew } from "react-icons/md";
import { useHistory, useLocation, useParams } from "react-router-dom";

import Card from "components/card/Card";
import { useCustomer } from "redux/hooks/useCustomer";

const prettyValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return value;
};

// Helper to validate and normalize URLs
const isValidUrl = (string) => {
  if (!string || typeof string !== "string") return false;
  const trimmed = string.trim();
  if (trimmed === "") return false;

  try {
    // Try to create a URL object - this validates the URL format
    let urlString = trimmed;
    // If URL doesn't start with http:// or https://, add https://
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = `https://${urlString}`;
    }
    new URL(urlString);
    return true;
  } catch (_) {
    return false;
  }
};

// Helper to normalize URL (add https:// if missing)
const normalizeUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const clientInfoSections = [
  {
    heading: "Look up",
    items: [
      { label: "Company name", key: "name" },
      { label: "Address1", key: "street" },
      { label: "Address2", key: "street2" },
      // Extra address lines (shown only when they have data)
      { label: "Address3", key: "street3" },
      { label: "Address4", key: "street4" },
      { label: "Address5", key: "street5" },
      { label: "Address6", key: "street6" },
      { label: "Address7", key: "street7" },
      { label: "Postcode + City", key: "city", formatter: (value, client) => `${client.zip || "-"} ${value || ""}`.trim() || "-" },
      { label: "Country", key: "country_name" },
      { label: "Reg No", key: "reg_no" },
      { label: "Payment Terms", key: "payment_term" },
      { label: "Clients Type", key: "type_client" },
      { label: "Company Type Text", key: "company_type_text" },
      { label: "Vessel Types", key: "vessel_type" },
      { label: "Category", key: "client_category" },
      { label: "Client Code", key: "client_code" },
      { label: "Email1", key: "email" },
      { label: "Email2", key: "email2" },
      { label: "Phone1", key: "phone" },
      { label: "Phone2", key: "phone2" },
      { label: "Website", key: "website" },
      { label: "Tariffs", key: "tariffs" },
      { label: "Client Invoicing", key: "client_invoicing" },
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
  { key: "whatsapp", label: "WhatsApp" },
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
  const labelColor = useColorModeValue("gray.600", "gray.300");
  const valueColor = useColorModeValue("gray.800", "white");
  const sectionHeadingBg = useColorModeValue("orange.50", "orange.700");
  const rowEvenBg = useColorModeValue("gray.50", "gray.700");
  const toast = useToast();

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
      whatsapp: child.whatsapp ? "Yes" : "No",
      remarks: getValue(child.remarks),
    }));
  }, [client]);

  const isBusy = isLoading;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLookupData = () => {
    if (!client) return;

    // Copy only main business information (no headings/subjects, no payment info or categories)
    const excludedKeys = [
      "client_category",  // Category
      "payment_term",     // Payment Terms
      "type_client",      // Client Type
      "vessel_type",      // Vessel Types
      "website",          // Website
      "remarks",          // Remarks
      "client_code",      // Client Code (right hand side)
    ];

    const values = clientInfoSections[0].items
      .filter(({ key, formatter }) => {
        if (excludedKeys.includes(key)) return false;
        const rawValue = formatter ? formatter(client[key], client) : client[key];
        const displayValue = prettyValue(rawValue);
        return displayValue && displayValue !== "-" && displayValue !== "";
      })
      .map(({ key, formatter }) => {
        const rawValue = formatter ? formatter(client[key], client) : client[key];
        return String(prettyValue(rawValue));
      });

    const textToCopy = values.join("\n");

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        toast({
          title: "Copied to clipboard",
          description: "Main company information has been copied to your clipboard.",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }).catch(() => {
        toast({
          title: "Copy failed",
          description: "Failed to copy information. Please try again.",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      });
    }
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 1cm;
            }
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
              padding: 0;
              margin: 0;
            }
            .no-print {
              display: none !important;
            }
            .print-content .chakra-box {
              overflow: visible !important;
            }
            .print-content .chakra-grid {
              page-break-inside: avoid !important;
            }
            /* Hide table on print, show grid instead */
            .print-content .client-people-table {
              display: none !important;
            }
            .print-content .client-people-grid {
              display: block !important;
            }
          }
          /* Show table on screen, hide grid */
          .client-people-grid {
            display: none;
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
            {client && (
              <Button
                leftIcon={<Icon as={MdEdit} />}
                colorScheme="blue"
                onClick={() => {
                  const clientId = client.id || id;
                  if (clientId) {
                    history.push({
                      pathname: `/admin/customer-registration`,
                      state: { client: client, clientId: clientId }
                    });
                  }
                }}
              >
                Edit Client
              </Button>
            )}
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
                <Flex justify="space-between" align="center">
                  <Text fontWeight="700" textTransform="uppercase" color={headingColor}>
                    Look up
                  </Text>
                  <Tooltip label="Copy all lookup information to clipboard">
                    <IconButton
                      aria-label="Copy lookup data"
                      icon={<Icon as={MdContentCopy} />}
                      size="sm"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={handleCopyLookupData}
                    />
                  </Tooltip>
                </Flex>
                {clientInfoSections.map((section) => {
                  // Define order for left (company details) and right (additional info) sides
                  const leftSideOrder = [
                    "name",        // Company name
                    "street",      // Address1
                    "street2",     // Address2
                    "street3",     // Address3
                    "street4",     // Address4
                    "street5",     // Address5
                    "street6",     // Address6
                    "street7",     // Address7
                    "city",        // Postcode + City (combined with formatter)
                    "country_name",
                    "reg_no",
                    "phone",
                    "phone2",
                    "email",
                    "email2",
                  ];
                  const rightSideOrder = [
                    "client_code",
                    "client_category",
                    "type_client",
                    "payment_term",
                    "vessel_type",
                    "remarks",
                    "website",
                  ];

                  // Helper to get displayable items in a given order
                  const getOrderedItems = (keysOrder) => {
                    return keysOrder
                      .map((key) => section.items.find((item) => item.key === key))
                      .filter((item) => {
                        if (!item) return false;
                        const rawValue = item.formatter ? item.formatter(client[item.key], client) : client[item.key];
                        const displayValue = prettyValue(rawValue);
                        return displayValue && displayValue !== "-" && displayValue !== "";
                      });
                  };

                  const leftItems = getOrderedItems(leftSideOrder);
                  const rightItems = getOrderedItems(rightSideOrder);

                  if (leftItems.length === 0 && rightItems.length === 0) {
                    return null;
                  }

                  const renderRow = ({ label, key, formatter }) => {
                    const rawValue = formatter ? formatter(client[key], client) : client[key];
                    const displayValue = prettyValue(rawValue);

                    // Special handling for website field - make it clickable if valid URL
                    if (key === "website" && isValidUrl(rawValue)) {
                      const normalizedUrl = normalizeUrl(rawValue);
                      return (
                        <Flex
                          key={key}
                          px={4}
                          py={2}
                          borderColor={borderColor}
                          justifyContent="flex-start"
                          alignItems="center"
                          gap={2}
                        >
                          <Text
                            fontSize="sm"
                            color={valueColor}
                            whiteSpace="nowrap"
                            overflow="hidden"
                            textOverflow="ellipsis"
                            maxW="180px"
                          >
                            {displayValue}
                          </Text>
                          <Button
                            size="xs"
                            colorScheme="blue"
                            variant="outline"
                            leftIcon={<Icon as={MdOpenInNew} />}
                            onClick={() => window.open(normalizedUrl, "_blank", "noopener,noreferrer")}
                          >
                            Visit
                          </Button>
                        </Flex>
                      );
                    }

                    // Special handling for remarks field - preserve line breaks for numbered lists
                    if (key === "remarks") {
                      return (
                        <Flex
                          key={key}
                          px={4}
                          py={2}
                          borderColor={borderColor}
                          justifyContent="flex-start"
                          alignItems="flex-start"
                          gap={2}
                        >
                          <Tooltip
                            label={displayValue}
                            hasArrow
                            isDisabled={!displayValue || String(displayValue).length <= 30}
                          >
                            <Text
                              fontSize="sm"
                              color={valueColor}
                              whiteSpace="pre-wrap"
                              overflow="visible"
                              maxW="220px"
                            >
                              {displayValue}
                            </Text>
                          </Tooltip>
                        </Flex>
                      );
                    }

                    // Default rendering for other fields
                    return (
                      <Flex
                        key={key}
                        px={4}
                        py={2}
                        borderColor={borderColor}
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        gap={2}
                      >
                        <Tooltip
                          label={displayValue}
                          hasArrow
                          isDisabled={!displayValue || String(displayValue).length <= 30}
                        >
                          <Text
                            fontSize="sm"
                            color={valueColor}
                            whiteSpace="nowrap"
                            overflow="hidden"
                            textOverflow="ellipsis"
                            maxW="220px"
                          >
                            {displayValue}
                          </Text>
                        </Tooltip>
                      </Flex>
                    );
                  };

                  return (
                    <GridItem key={section.heading} border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={0}>
                        {/* Left column: company details */}
                        <GridItem borderRight={{ base: "none", md: `1px solid ${borderColor}` }}>
                          {leftItems.map(renderRow)}
                        </GridItem>
                        {/* Right column: additional info */}
                        <GridItem>
                          {rightItems.map(renderRow)}
                        </GridItem>
                      </Grid>
                    </GridItem>
                  );
                })}
              </Grid>

              <Box>
                <Heading size="md" color={headingColor} mb={4}>
                  Client People
                </Heading>

                {/* Table view for on-screen display */}
                <Box className="client-people-table" border="1px solid" borderColor={borderColor} borderRadius="lg" overflow="auto" bg={cardBg} boxShadow="sm">
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
                                <Tooltip
                                  label={prettyValue(person[column.key])}
                                  hasArrow
                                  isDisabled={!prettyValue(person[column.key])}
                                >
                                  <Text
                                    fontSize="sm"
                                    color={valueColor}
                                    whiteSpace={column.key === "remarks" ? "pre-wrap" : "nowrap"}
                                    overflow={column.key === "remarks" ? "visible" : "hidden"}
                                    textOverflow={column.key === "remarks" ? "clip" : "ellipsis"}
                                    maxW="220px"
                                  >
                                    {prettyValue(person[column.key])}
                                  </Text>
                                </Tooltip>
                              </Td>
                            ))}
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </Box>

                {/* Grid view for printing */}
                <Box className="client-people-grid">
                  {clientPeople.length === 0 ? (
                    <Box border="1px solid" borderColor={borderColor} borderRadius="md" p={8} textAlign="center">
                      <Text color={labelColor}>No client people available.</Text>
                    </Box>
                  ) : (
                    <Stack spacing={6}>
                      {clientPeople.map((person, personIndex) => (
                        <Box key={personIndex} border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={0}>
                            {peopleTableColumns.map((column, idx) => {
                              const addRightBorder = idx % 2 === 0;
                              return (
                                <GridItem
                                  key={column.key}
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
                                    {column.label}
                                  </Text>
                                  <Text fontSize="sm" color={valueColor} whiteSpace="pre-wrap">
                                    {prettyValue(person[column.key])}
                                  </Text>
                                </GridItem>
                              );
                            })}
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  )}
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
