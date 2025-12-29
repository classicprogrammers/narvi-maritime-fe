import React, { useMemo, useEffect, useState } from "react";
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
import { useVendor } from "redux/hooks/useVendor";
import { getVendorByIdApi } from "api/vendor";

// Helper to get country name from country_id
const getCountryName = (countryId, countries) => {
  if (!countryId || !countries) return "";
  const countryList = Array.isArray(countries) ? countries : countries?.countries || [];
  const country = countryList.find(
    (c) => c.id === countryId || c.id === parseInt(countryId)
  );
  return country ? country.name : "";
};

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

// Normalize approval values to boolean
const convertApprovalValueToBoolean = (value) => {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0 || value === "" || value === null || value === undefined) return false;
  return false;
};

const agentInfoSections = [
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
      { label: "Postcode + City", key: "city", formatter: (value, agent) => `${agent.zip || "-"} ${value || ""}`.trim() || "-" },
      { label: "Country", key: "country_name" },
      { label: "Agent Code", key: "agentsdb_id" },
      { label: "Reg No", key: "reg_no" },
      { label: "Payment Terms", key: "payment_term" },
      { label: "Agents Type", key: "type_client" },
      { label: "Address Type", key: "address_type" },
      { label: "Warnings", key: "warnings" },
      { label: "PIC", key: "pic", formatter: (value, agent) => agent.pic || agent.agents_pic || value || "-" },
      { label: "DB ID", key: "id" },
      { label: "Email1", key: "email" },
      { label: "Email2", key: "email2" },
      { label: "Phone1", key: "phone" },
      { label: "Phone2", key: "phone2" },
      { label: "Website", key: "website" },
      { label: "Remarks", key: "remarks" },
    ],
  },
];

// Helper function to build legacy CNEE items dynamically based on agent data
const buildLegacyCneeItems = (agent) => {
  const items = [];

  for (let i = 1; i <= 12; i++) {
    const cneeValue = agent[`cnee${i}`];
    if (cneeValue && String(cneeValue).trim() !== "") {
      items.push({ label: `CNEE ${i}`, key: `cnee${i}` });
    }
  }

  // Add CNEE Text if it has a value
  if (agent.cnee_text && String(agent.cnee_text).trim() !== "") {
    items.push({ label: "CNEE Text", key: "cnee_text" });
  }

  // Add Narvi Maritime Approved Agent (always show if field exists)
  if (agent.narvi_maritime_approved_agent !== undefined || agent.narvi_approved !== undefined) {
    items.push({
      label: "Narvi Maritime Approved Agent",
      key: "narvi_maritime_approved_agent",
      formatter: (value, agent) => {
        const approvedValue = value !== undefined ? value : agent.narvi_approved;
        if (approvedValue === true || approvedValue === "true" || approvedValue === "1" || approvedValue === 1) return "Yes";
        if (approvedValue === false || approvedValue === "false" || approvedValue === "0" || approvedValue === 0) return "No";
        return prettyValue(approvedValue);
      }
    });
  }

  // Add Warnings (always show if field exists, even if empty, as it might be important)
  if (agent.warnings !== undefined) {
    items.push({ label: "Warnings", key: "warnings" });
  }

  return items;
};

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

const AgentDetail = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { vendors = [], countries = [], isLoading: vendorsLoading, getVendors } = useVendor();
  const [agent, setAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("secondaryGray.900", "white");
  const labelColor = useColorModeValue("gray.600", "gray.300");
  const valueColor = useColorModeValue("gray.800", "white");
  const sectionHeadingBg = useColorModeValue("orange.50", "orange.700");
  const rowEvenBg = useColorModeValue("gray.50", "gray.700");
  const toast = useToast();

  // Load agent data
  useEffect(() => {
    const loadAgent = async () => {
      if (!id) {
        setIsLoading(false);
        setError("No agent ID provided");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log("Loading agent with ID:", id);

        // First, try to get from location state
        if (location.state?.agent) {
          console.log("Found agent in location.state:", location.state.agent);
          const agentFromState = location.state.agent;
          // Add country_name if not present
          if (!agentFromState.country_name && agentFromState.country_id) {
            const countryList = Array.isArray(countries) ? countries : countries?.countries || [];
            agentFromState.country_name = getCountryName(agentFromState.country_id, countryList);
          }
          setAgent(agentFromState);
          setIsLoading(false);
          return;
        }

        // Second, try to find in vendors list (check all vendors, not just top-level)
        const list = Array.isArray(vendors)
          ? vendors
          : Array.isArray(vendors?.vendors)
            ? vendors.vendors
            : Array.isArray(vendors?.agents)
              ? vendors.agents
              : [];

        const foundInList = list.find(
          (item) => {
            const itemId = item.id || item.agent_id || item.vendor_id;
            const matches = String(itemId) === String(id);
            if (matches) {
              console.log("Found agent in vendors list:", item);
            }
            return matches;
          }
        );

        if (foundInList) {
          console.log("Using agent from vendors list");
          // Add country_name if not present
          const agentWithCountry = { ...foundInList };
          if (!agentWithCountry.country_name && agentWithCountry.country_id) {
            const countryList = Array.isArray(countries) ? countries : countries?.countries || [];
            agentWithCountry.country_name = getCountryName(agentWithCountry.country_id, countryList);
          }
          setAgent(agentWithCountry);
          setIsLoading(false);
          return;
        }

        console.log("Agent not found in vendors list, trying API...");

        // Third, fetch from API
        try {
          const response = await getVendorByIdApi(id);
          console.log("API Response for agent ID", id, ":", response);

          // Try multiple possible response structures
          let agentData = null;

          // Check JSON-RPC format: response.result.data or response.result
          if (response?.result) {
            if (response.result.data) {
              agentData = response.result.data;
            } else if (response.result.status === 'success' && response.result.data) {
              agentData = response.result.data;
            } else if (!response.result.status || response.result.status !== 'error') {
              // If result exists and is not an error, it might be the data itself
              agentData = response.result;
            }
          }

          // Check direct data properties
          if (!agentData) {
            agentData = response?.data || response?.agent || response?.vendor;
          }

          // If still no data, check if response itself is an object with id
          if (!agentData && response && typeof response === 'object' && (response.id || response.agent_id || response.vendor_id)) {
            agentData = response;
          }

          if (agentData && (agentData.id || agentData.agent_id || agentData.vendor_id)) {
            // Add country_name if not present
            if (!agentData.country_name && agentData.country_id) {
              const countryList = Array.isArray(countries) ? countries : countries?.countries || [];
              agentData.country_name = getCountryName(agentData.country_id, countryList);
            }
            console.log("Setting agent data:", agentData);
            setAgent(agentData);
          } else {
            const errorMsg = "No valid agent data in API response";
            console.error(errorMsg, {
              response,
              hasResult: !!response?.result,
              hasData: !!response?.data,
              hasAgent: !!response?.agent,
              hasVendor: !!response?.vendor,
            });
            setError(errorMsg);
          }
        } catch (apiError) {
          const errorMsg = apiError?.response?.data?.result?.message
            || apiError?.response?.data?.message
            || apiError?.message
            || `Failed to fetch agent: ${apiError?.response?.status || 'Unknown error'}`;
          console.error("Error fetching agent from API:", apiError);
          console.error("Error details:", {
            message: apiError?.message,
            response: apiError?.response?.data,
            status: apiError?.response?.status,
            url: apiError?.config?.url,
          });
          setError(errorMsg);
        }
      } catch (error) {
        console.error("Error loading agent:", error);
        setError(error?.message || "Failed to load agent");
      } finally {
        setIsLoading(false);
      }
    };

    // Always load vendors list to ensure it's available
    getVendors();

    loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location.state]);

  // Re-check vendors list when it's loaded (if agent not already found)
  useEffect(() => {
    if (!id || agent) return; // Skip if no ID or agent already loaded

    const list = Array.isArray(vendors)
      ? vendors
      : Array.isArray(vendors?.vendors)
        ? vendors.vendors
        : Array.isArray(vendors?.agents)
          ? vendors.agents
          : [];

    if (list.length > 0) {
      const foundInList = list.find(
        (item) =>
          String(item.id) === String(id) ||
          String(item.agent_id) === String(id) ||
          String(item.vendor_id) === String(id)
      );

      if (foundInList) {
        const agentWithCountry = { ...foundInList };
        if (!agentWithCountry.country_name && agentWithCountry.country_id) {
          const countryList = Array.isArray(countries) ? countries : countries?.countries || [];
          agentWithCountry.country_name = getCountryName(agentWithCountry.country_id, countryList);
        }
        setAgent(agentWithCountry);
        setIsLoading(false);
      }
    }
  }, [vendors, countries, id, agent]);

  // Get agent people from children array
  const agentPeople = useMemo(() => {
    if (!agent || !Array.isArray(agent.children)) {
      return [];
    }

    // Helper function to convert false/null/undefined to empty string
    const getValue = (val) =>
      val !== false && val !== null && val !== undefined ? String(val) : "";

    return agent.children.map((child) => ({
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
  }, [agent]);

  // Normalize CNEE rows according to new structure (agent_cnee_ids), with legacy fallback
  const cneeRows = useMemo(() => {
    if (!agent) return [];

    // Prefer new structured CNEE records
    if (Array.isArray(agent.agent_cnee_ids) && agent.agent_cnee_ids.length > 0) {
      return agent.agent_cnee_ids.map((item) => ({
        cnee1: item.cnee1 || "",
        cnee_type_text: item.cnee_type_text || item.cnee_type || "",
        cnee_text: item.cnee_text || "",
        warnings: item.warnings || "",
        narvi_approved: convertApprovalValueToBoolean(
          item.narvi_maritime_approved_agent ?? item.narvi_approved
        ),
      }));
    }

    // Fallback to legacy flat fields by collapsing into a single row if any legacy data exists
    const hasAnyLegacy =
      Array.from({ length: 12 }).some((_, i) => {
        const val = agent[`cnee${i + 1}`];
        return val && String(val).trim() !== "";
      }) ||
      (agent.cnee_text && String(agent.cnee_text).trim() !== "") ||
      agent.warnings !== undefined ||
      agent.narvi_maritime_approved_agent !== undefined ||
      agent.narvi_approved !== undefined;

    if (!hasAnyLegacy) return [];

    const legacyTypes = [];
    for (let i = 1; i <= 12; i++) {
      const val = agent[`cnee${i}`];
      if (val && String(val).trim() !== "") {
        legacyTypes.push(`CNEE ${i}: ${String(val).trim()}`);
      }
    }

    return [
      {
        cnee1: legacyTypes.length > 0 ? legacyTypes.join("\n") : "N/A",
        cnee_type_text: "", // Empty for legacy data
        cnee_text: agent.cnee_text || "",
        warnings: agent.warnings || "",
        narvi_approved: convertApprovalValueToBoolean(
          agent.narvi_maritime_approved_agent ?? agent.narvi_approved
        ),
      },
    ];
  }, [agent]);

  const handleCopySingleCneeData = (rowIndex) => {
    if (!cneeRows || cneeRows.length === 0 || !cneeRows[rowIndex]) {
      toast({
        title: "No CNEE information",
        description: "There is no CNEE data to copy.",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const row = cneeRows[rowIndex];
    
    // Only copy CNEE TEXT
    const cneeText = row.cnee_text && String(row.cnee_text).trim() !== "" 
      ? String(row.cnee_text).trim() 
      : "";

    if (!cneeText) {
      toast({
        title: "Nothing to copy",
        description: "CNEE TEXT is empty.",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    navigator.clipboard
      .writeText(cneeText)
      .then(() => {
        toast({
          title: "CNEE TEXT copied to clipboard",
          description: `CNEE ${rowIndex + 1} text has been copied.`,
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      })
      .catch(() => {
        toast({
          title: "Copy failed",
          description: "Unable to copy CNEE text. Please try again.",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      });
  };

  const isBusy = isLoading || vendorsLoading;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLookupData = () => {
    if (!agent) return;

    // Copy only main business information (no headings/subjects, no payment info, categories, or personal data)
    const excludedKeys = [
      "address_type",     // Address Type
      "agentsdb_id",      // Agent Code
      "type_client",      // Agent Type
      "payment_term",     // Payment Terms
      "remarks",          // Remarks
      "website",          // Website
      "warnings",         // Warnings
      "id",               // DB ID
      "pic",              // PIC (personal)
    ];

    const values = agentInfoSections[0].items
      .filter(({ key, formatter }) => {
        if (excludedKeys.includes(key)) return false;
        let rawValue = formatter ? formatter(agent[key], agent) : agent[key];
        // Compute country_name if not present
        if (key === "country_name" && !rawValue && agent.country_id) {
          const countryList = Array.isArray(countries) ? countries : countries?.countries || [];
          rawValue = getCountryName(agent.country_id, countryList);
        }
        const displayValue = prettyValue(rawValue);
        return displayValue && displayValue !== "-" && displayValue !== "";
      })
      .map(({ key, formatter }) => {
        let rawValue = formatter ? formatter(agent[key], agent) : agent[key];
        // Compute country_name if not present
        if (key === "country_name" && !rawValue && agent.country_id) {
          const countryList = Array.isArray(countries) ? countries : countries?.countries || [];
          rawValue = getCountryName(agent.country_id, countryList);
        }
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
              visibility: visible !important;
            }
            .print-content {
              position: static !important;
              left: auto !important;
              top: auto !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              padding-top: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-content * {
              color: #000 !important;
              background: transparent !important;
              box-shadow: none !important;
              border-color: #000 !important;
            }
            .print-content .chakra-box,
            .print-content .chakra-grid,
            .print-content .chakra-stack,
            .print-content .chakra-flex {
              overflow: visible !important;
              page-break-inside: auto !important;
            }
            /* Hide table on print, show grid instead */
            .print-content .agent-people-table {
              display: none !important;
            }
            .print-content .agent-people-grid {
              display: block !important;
            }
            /* Allow page breaks */
            .print-content .chakra-grid-item,
            .print-content .chakra-box {
              page-break-inside: auto !important;
              break-inside: auto !important;
            }
          }
          /* Show table on screen, hide grid */
          .agent-people-grid {
            display: none;
          }
        `}
      </style>
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} className="print-content">
        <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
          <Heading size="lg" color={headingColor}>
            Agent Details
          </Heading>
          <Flex gap={2} className="no-print">
            <Button leftIcon={<Icon as={MdPrint} />} onClick={handlePrint}>
              Print
            </Button>
            {agent && (
              <Button
                leftIcon={<Icon as={MdEdit} />}
                colorScheme="blue"
                onClick={() => {
                  const agentId = agent.id || agent.agent_id || agent.vendor_id || id;
                  if (agentId) {
                    history.push({
                      pathname: `/admin/vendor-registration/${agentId}`,
                      state: { vendorData: agent }
                    });
                  }
                }}
              >
                Edit Agent
              </Button>
            )}
            <Button onClick={() => history.push("/admin/contacts/agents")}>Back to Agents</Button>
          </Flex>
        </Flex>

        <Card p={{ base: 4, md: 6 }} bg={cardBg} border="1px" borderColor={borderColor} mb={8}>
          {isBusy && !agent ? (
            <Text color={labelColor}>Loading agent information...</Text>
          ) : !agent && !isBusy ? (
            <Box>
              <Text color={labelColor} mb={2} fontWeight="bold">Agent not found.</Text>
              {error && (
                <Text color="red.500" fontSize="sm" mb={2}>
                  Error: {error}
                </Text>
              )}
              <Text color={labelColor} fontSize="sm" mb={4}>
                Agent ID: {id}
              </Text>
              <Text color={labelColor} fontSize="sm" mb={4}>
                {vendors?.length > 0
                  ? `Checked ${vendors.length} vendors in list.`
                  : "Vendors list not loaded yet."}
              </Text>
              <Button onClick={() => history.push("/admin/contacts/agents")} colorScheme="blue">
                Back to Agents
              </Button>
            </Box>
          ) : agent ? (
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
                {agentInfoSections.map((section) => {
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
                    "pic",
                  ];
                  const rightSideOrder = [
                    "address_type",
                    "agentsdb_id",
                    "type_client",
                    "payment_term",
                    "remarks",
                    "website",
                    "warnings",
                    "id", // DB ID
                  ];

                  // Helper to resolve raw value with special rules
                  const getRawValue = (item) => {
                    const { key, formatter } = item;
                    let rawValue = formatter ? formatter(agent[key], agent) : agent[key];
                    if (key === "id") {
                      rawValue = agent.id || agent.agent_id || agent.vendor_id || id || "";
                    }
                    if (key === "payment_term" && !rawValue) {
                      rawValue = agent.payment_terms || agent.payment_term || "";
                    }
                    if (key === "type_client" && !rawValue) {
                      rawValue = agent.agents_type || agent.type_client || "";
                    }
                    if (key === "country_name" && !rawValue && agent.country_id) {
                      const countryList = Array.isArray(countries) ? countries : countries?.countries || [];
                      rawValue = getCountryName(agent.country_id, countryList);
                    }
                    return rawValue;
                  };

                  const getOrderedItems = (keysOrder) =>
                    keysOrder
                      .map((key) => section.items.find((item) => item.key === key))
                      .filter((item) => {
                        if (!item) return false;
                        const rawValue = getRawValue(item);
                        // Always show DB ID even if value is falsy
                        if (item.key === "id") return true;
                        const displayValue = prettyValue(rawValue);
                        return displayValue && displayValue !== "-" && displayValue !== "";
                      });

                  const leftItems = getOrderedItems(leftSideOrder);
                  const rightItems = getOrderedItems(rightSideOrder);

                  if (leftItems.length === 0 && rightItems.length === 0) {
                    return null;
                  }

                  const renderRow = (item) => {
                    const { key } = item;
                    const rawValue = getRawValue(item);
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

              {/* CNEE Information Section - structured view */}
              {cneeRows.length > 0 ? (
                <Grid templateColumns={{ base: "1fr", lg: "1fr" }} gap={4}>
                  <Flex justify="space-between" align="center">
                    <Text fontWeight="700" textTransform="uppercase" color={headingColor}>
                      CNEE Information
                    </Text>
                  </Flex>
                  <GridItem border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                    <Stack spacing={0}>
                      {cneeRows.map((row, rowIndex) => (
                        <Box
                          key={rowIndex}
                          borderTop={rowIndex === 0 ? "none" : "1px solid"}
                          borderColor={borderColor}
                          px={4}
                          py={3}
                        >
                          <Flex justify="flex-end" mb={2} className="no-print">
                            <Button
                              size="xs"
                              variant="outline"
                              leftIcon={<Icon as={MdContentCopy} />}
                              onClick={() => handleCopySingleCneeData(rowIndex)}
                            >
                              Copy CNEE {rowIndex + 1} information to the clipboard
                            </Button>
                          </Flex>
                          <Grid
                            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                            columnGap={4}
                            rowGap={3}
                          >
                            {/* CNEE1 - Free Text */}
                            <GridItem>
                              <Flex
                                alignItems="center"
                                gap={4}
                                mb={{ base: 3, md: 0 }}
                              >
                                <Text
                                  fontSize="xs"
                                  fontWeight="600"
                                  textTransform="uppercase"
                                  color={labelColor}
                                  minW="90px"
                                >
                                  CNEE1
                                </Text>
                                <Text fontSize="sm" color={valueColor} whiteSpace="pre-wrap">
                                  {prettyValue(row.cnee1)}
                                </Text>
                              </Flex>
                            </GridItem>

                            {/* CNEE Type */}
                            <GridItem>
                              <Flex
                                alignItems="center"
                                gap={4}
                                mb={{ base: 3, md: 0 }}
                              >
                                <Text
                                  fontSize="xs"
                                  fontWeight="600"
                                  textTransform="uppercase"
                                  color={labelColor}
                                  minW="90px"
                                >
                                  CNEE Type
                                </Text>
                                <Text fontSize="sm" color={valueColor} whiteSpace="pre-wrap">
                                  {prettyValue(row.cnee_type_text)}
                                </Text>
                              </Flex>
                            </GridItem>

                            {/* CNEE Text */}
                            <GridItem colSpan={{ base: 1, md: 2 }}>
                              <Flex
                                mt={3}
                                alignItems="flex-start"
                                gap={4}
                              >
                                <Text
                                  fontSize="xs"
                                  fontWeight="600"
                                  textTransform="uppercase"
                                  color={labelColor}
                                  mt={1}
                                  minW="90px"
                                >
                                  CNEE Text
                                </Text>
                                <Text
                                  fontSize="sm"
                                  color={valueColor}
                                  whiteSpace="pre-wrap"
                                  flex="1"
                                >
                                  {prettyValue(row.cnee_text)}
                                </Text>
                              </Flex>
                            </GridItem>

                            {/* Warnings */}
                            <GridItem colSpan={{ base: 1, md: 2 }}>
                              <Flex
                                mt={3}
                                alignItems="flex-start"
                                gap={4}
                              >
                                <Text
                                  fontSize="xs"
                                  fontWeight="600"
                                  textTransform="uppercase"
                                  color={labelColor}
                                  mt={1}
                                  minW="90px"
                                >
                                  Warnings
                                </Text>
                                <Text
                                  fontSize="sm"
                                  color={valueColor}
                                  whiteSpace="pre-wrap"
                                  flex="1"
                                >
                                  {prettyValue(row.warnings)}
                                </Text>
                              </Flex>
                            </GridItem>


                            {/* Approved */}
                            <GridItem>
                              <Flex alignItems="center" gap={4}>
                                <Text
                                  fontSize="xs"
                                  fontWeight="600"
                                  textTransform="uppercase"
                                  color={labelColor}
                                  minW="150px"
                                >
                                  Narvi Maritime Approved
                                </Text>
                                <Text fontSize="sm" color={valueColor}>
                                  {row.narvi_approved ? "Yes" : "No"}
                                </Text>
                              </Flex>
                            </GridItem>

                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  </GridItem>
                </Grid>
              ) : null}

              <Box>
                <Heading size="md" color={headingColor} mb={4}>
                  Agent People
                </Heading>

                {/* Table view for on-screen display */}
                <Box className="agent-people-table" border="1px solid" borderColor={borderColor} borderRadius="lg" overflow="auto" bg={cardBg} boxShadow="sm">
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
                      {agentPeople.length === 0 ? (
                        <Tr>
                          <Td colSpan={peopleTableColumns.length} textAlign="center" py={8}>
                            <Text color={labelColor}>No agent people available.</Text>
                          </Td>
                        </Tr>
                      ) : (
                        agentPeople.map((person, rowIndex) => (
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
                <Box className="agent-people-grid">
                  {agentPeople.length === 0 ? (
                    <Box border="1px solid" borderColor={borderColor} borderRadius="md" p={8} textAlign="center">
                      <Text color={labelColor}>No agent people available.</Text>
                    </Box>
                  ) : (
                    <Stack spacing={6}>
                      {agentPeople.map((person, personIndex) => (
                        <Box key={personIndex} border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={0}>
                            {peopleTableColumns.map((column, idx) => {
                              const addRightBorder = idx % 2 === 0; // first column cells
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
          ) : null}
        </Card>
      </Box>
    </>
  );
};

export default AgentDetail;
