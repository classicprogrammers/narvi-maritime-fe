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
import { useVendor } from "redux/hooks/useVendor";

const prettyValue = (value) => (value === null || value === undefined || value === "" ? "-" : value);

const agentInfoSections = [
  {
    heading: "Look up",
    items: [
      { label: "Company name", key: "name" },
      { label: "Address1", key: "street" },
      { label: "Postcode + City", key: "city", formatter: (value, agent) => `${agent.zip || "-"} ${value || ""}`.trim() || "-" },
      { label: "Country", key: "country_name" },
      { label: "Agent ID", key: "agentsdb_id" },
      { label: "Email1", key: "email" },
      { label: "Phone1", key: "phone" },
      { label: "Phone2", key: "mobile" },
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

const emptyPersonRow = {
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

const AgentDetail = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const { vendors = [], isLoading } = useVendor();
  const [peopleRows, setPeopleRows] = useState([]);
  const toast = useToast();

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("secondaryGray.900", "white");
  const labelColor = useColorModeValue("gray.600", "gray.300");
  const valueColor = useColorModeValue("gray.800", "white");
  const rowEvenBg = useColorModeValue("gray.50", "gray.700");

  const agent = useMemo(() => {
    if (location.state?.agent) return location.state.agent;
    const list = Array.isArray(vendors) ? vendors : Array.isArray(vendors?.vendors) ? vendors.vendors : [];
    return list.find((item) => String(item.id) === String(id));
  }, [vendors, id, location.state]);

  const isBusy = isLoading;

  const handleAddPersonRow = () => {
    const required = ["first_name", "last_name", "email"];
    const hasIncomplete = peopleRows.some((row) => required.some((f) => !String(row[f] || "").trim()));
    if (hasIncomplete) {
      toast({ title: "Complete current row(s) first", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    setPeopleRows((prev) => [...prev, { ...emptyPersonRow }]);
  };

  const handlePersonFieldChange = (index, field) => (event) => {
    const value = event.target.value;
    setPeopleRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitPeople = () => {
    const required = ["first_name", "last_name", "email"];
    const hasIncomplete = peopleRows.some((row) => required.some((f) => !String(row[f] || "").trim()));
    if (hasIncomplete) {
      toast({ title: "Incomplete rows", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    console.log("Submitting agent people", peopleRows);
  };

  const requiredFields = ["first_name", "last_name", "email"];
  const isAddDisabled = peopleRows.some((row) => requiredFields.some((f) => !String(row[f] || "").trim()));

  const placeholders = {
    first_name: "e.g. John",
    last_name: "e.g. Doe",
    prefix: "e.g. Mr/Ms",
    job_title: "e.g. Ops Manager",
    email: "e.g. john@agent.com",
    tel_direct: "e.g. +65 1234 5678",
    phone: "e.g. +65 9123 4567",
    tel_other: "e.g. +65 1111 2222",
    linked_in: "https://linkedin.com/in/...",
    remarks: "Notes...",
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Heading size="lg" color={headingColor}>Agent Details</Heading>
        <Button onClick={() => history.push("/admin/contacts/agents")}>Back to Agents</Button>
      </Flex>

      <Card p={{ base: 4, md: 6 }} bg={cardBg} border="1px" borderColor={borderColor} mb={8}>
        {isBusy && !agent ? (
          <Text color={labelColor}>Loading agent information...</Text>
        ) : !agent ? (
          <Text color={labelColor}>Agent not found.</Text>
        ) : (
          <Stack spacing={10}>
            <Grid templateColumns={{ base: "1fr", lg: "1fr" }} gap={6}>
              <Text fontWeight="700" textTransform="uppercase" color={headingColor}>Look up</Text>
              {agentInfoSections.map((section) => (
                <GridItem key={section.heading} border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={0}>
                    {section.items.map(({ label, key, formatter }, idx) => {
                      const rawValue = formatter ? formatter(agent[key], agent) : agent[key];
                      const addRightBorder = idx % 2 === 0;
                      return (
                        <GridItem key={key} px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: addRightBorder ? `1px solid ${borderColor}` : "none" }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                          <Text fontSize="xs" fontWeight="600" color={labelColor} textTransform="uppercase">{label}</Text>
                          <Text fontSize="sm" color={valueColor} textAlign="right">{prettyValue(rawValue)}</Text>
                        </GridItem>
                      );
                    })}
                  </Grid>
                </GridItem>
              ))}
            </Grid>

            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color={headingColor}>Agent People</Heading>
                <Button colorScheme="blue" onClick={handleAddPersonRow} isDisabled={isAddDisabled}>Add Agent Person</Button>
              </Flex>

              <Box border="1px solid" borderColor={borderColor} borderRadius="lg" overflow="auto" bg={cardBg} boxShadow="sm">
                <Table size="sm" sx={{ tableLayout: "auto" }}>
                  <Thead position="sticky" top={0} zIndex={1}>
                    <Tr>
                      {peopleTableColumns.map((column) => (
                        <Th key={column.key} fontSize="xs" minW="170px" textTransform="uppercase" color={headingColor}>{column.label}</Th>
                      ))}
                      <Th fontSize="xs" textTransform="uppercase" color={headingColor} w="80px">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {peopleRows.length === 0 ? (
                      <Tr>
                        <Td colSpan={peopleTableColumns.length + 1} textAlign="center" py={8}><Text color={labelColor}>No agent people added yet.</Text></Td>
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
                                placeholder={placeholders[column.key]}
                              />
                            </Td>
                          ))}
                          <Td px={3} py={2}>
                            <IconButton aria-label="Delete row" icon={<DeleteIcon />} size="sm" colorScheme="red" variant="ghost" onClick={() => setPeopleRows((prev) => prev.filter((_, idx) => idx !== rowIndex))} />
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>

              <Flex justify="flex-end" mt={4}>
                <Button colorScheme="green" onClick={handleSubmitPeople} isDisabled={peopleRows.length === 0 || isAddDisabled}>Submit</Button>
              </Flex>
            </Box>
          </Stack>
        )}
      </Card>
    </Box>
  );
};

export default AgentDetail;


