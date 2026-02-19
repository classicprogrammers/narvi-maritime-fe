import React from "react";
import {
  Box,
  Badge,
  Button,
  Flex,
  HStack,
  VStack,
  Text,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdSearch, MdOpenInNew, MdClear, MdPerson } from "react-icons/md";
import Card from "components/card/Card";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import { useHistory } from "react-router-dom";

const Phonebook = () => {
  const history = useHistory();
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputBg = useColorModeValue("white", "navy.900");
  const emptyStateTextColor = useColorModeValue("gray.500", "gray.400");
  const jobTitleTextColor = useColorModeValue("gray.500", "gray.400");
  const theadBg = useColorModeValue("gray.50", "gray.800");
  const tableScrollBg = useColorModeValue("white", "gray.900");

  const [source, setSource] = React.useState("all"); // 'all' | 'client' | 'agent'
  const [company, setCompany] = React.useState("");
  const [personName, setPersonName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dbId, setDbId] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 50;

  const fetchAllCustomers = React.useCallback((apiParams = {}) => {
    const cached = getCached(MASTER_KEYS.CLIENTS) ?? [];
    const list = Array.isArray(cached) ? cached : [];
    const nameFilter = (apiParams.name?.trim() || "").toLowerCase();
    const emailFilter = (apiParams.email?.trim() || "").toLowerCase();
    const clientCodeFilter = (apiParams.client_code?.trim() || "").toLowerCase();
    const searchFilter = (apiParams.search?.trim() || "").toLowerCase();
    if (!nameFilter && !emailFilter && !clientCodeFilter && !searchFilter) {
      return list;
    }
    return list.filter((c) => {
      const name = (c.name || c.company_name || "").toLowerCase();
      const email = (c.email || c.email2 || "").toLowerCase();
      const clientCode = (c.client_code || "").toLowerCase();
      const matchesName = !nameFilter || name.includes(nameFilter);
      const matchesEmail = !emailFilter || email.includes(emailFilter) ||
        (Array.isArray(c.children) && c.children.some((p) =>
          ((p.email || p.email1 || p.email2 || "").toLowerCase().includes(emailFilter))
        ));
      const matchesClientCode = !clientCodeFilter || clientCode.includes(clientCodeFilter);
      const matchesSearch = !searchFilter ||
        name.includes(searchFilter) || email.includes(searchFilter) || clientCode.includes(searchFilter);
      return matchesName && matchesEmail && matchesClientCode && matchesSearch;
    });
  }, []);

  const fetchAllAgents = React.useCallback((apiParams = {}) => {
    const cached = getCached(MASTER_KEYS.AGENTS) ?? [];
    const list = Array.isArray(cached) ? cached : [];
    const nameFilter = (apiParams.name?.trim() || "").toLowerCase();
    const agentsdbIdFilter = (apiParams.agentsdb_id?.trim() || "").toLowerCase();
    const searchFilter = (apiParams.search?.trim() || "").toLowerCase();
    if (!nameFilter && !agentsdbIdFilter && !searchFilter) {
      return list;
    }
    return list.filter((a) => {
      const name = (a.name || "").toLowerCase();
      const agentsdbId = (a.agentsdb_id || "").toLowerCase();
      const matchesName = !nameFilter || name.includes(nameFilter);
      const matchesAgentsdbId = !agentsdbIdFilter || agentsdbId.includes(agentsdbIdFilter);
      const matchesSearch = !searchFilter ||
        name.includes(searchFilter) || agentsdbId.includes(searchFilter);
      return matchesName && matchesAgentsdbId && matchesSearch;
    });
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const allRows = [];
      const apiParams = {
        name: company.trim() || undefined,
        email: email.trim() || undefined,
        client_code: (source === "client" || source === "all") ? (dbId.trim() || undefined) : undefined,
        agentsdb_id: (source === "agent" || source === "all") ? (dbId.trim() || undefined) : undefined,
      };

      if (source === "client" || source === "all") {
        const clientList = await fetchAllCustomers(apiParams);

        const topLevelClients = clientList.filter((c) => {
          const parentValue = c?.parent_id ?? c?.parentId ?? c?.parent;
          return (
            parentValue === false ||
            parentValue === null ||
            parentValue === undefined ||
            parentValue === ""
          );
        });

        // Extract people from clients
        topLevelClients.forEach((client) => {
          const children = client.children || client.agent_people || client.people || client.contacts || [];

          if (Array.isArray(children) && children.length > 0) {
            // Add each person as a separate row
            children.forEach((person) => {
              if (person && (person.first_name || person.last_name || person.name || person.email)) {
                const firstName = person.first_name || "";
                const lastName = person.last_name || "";
                const fullName = person.name || `${firstName} ${lastName}`.trim() || "-";

                allRows.push({
                  type: "Client",
                  companyId: client.id,
                  personId: person.id,
                  company: client.name || "-",
                  person: fullName,
                  email: person.email || person.email1 || person.email2 || "",
                  phone: person.phone || person.tel_direct || person.tel_other || person.mobile || "",
                  dbId: client.client_code || "",
                  jobTitle: person.job_title || "",
                  raw: { client, person },
                });
              }
            });
          } else {
            // If no people, show the company itself
            allRows.push({
              type: "Client",
              companyId: client.id,
              personId: null,
              company: client.name || "-",
              person: "-",
              email: client.email || client.email2 || "",
              phone: client.phone || client.phone2 || "",
              dbId: client.client_code || "",
              jobTitle: "",
              raw: { client, person: null },
            });
          }
        });
      }

      if (source === "agent" || source === "all") {
        const agentList = await fetchAllAgents(apiParams);

        const topLevelAgents = agentList.filter((a) => {
          const parentValue = a?.parent_id ?? a?.parentId ?? a?.parent;
          return (
            parentValue === false ||
            parentValue === null ||
            parentValue === undefined ||
            parentValue === ""
          );
        });

        // Extract people from agents
        topLevelAgents.forEach((agent) => {
          const children = agent.children || agent.agent_people || agent.people || agent.contacts || [];

          if (Array.isArray(children) && children.length > 0) {
            // Add each person as a separate row
            children.forEach((person) => {
              if (person && (person.first_name || person.last_name || person.name || person.email)) {
                const firstName = person.first_name || "";
                const lastName = person.last_name || "";
                const fullName = person.name || `${firstName} ${lastName}`.trim() || "-";

                allRows.push({
                  type: "Agent",
                  companyId: agent.id,
                  personId: person.id,
                  company: agent.name || "-",
                  person: fullName,
                  email: person.email || person.email1 || person.email2 || "",
                  phone: person.phone || person.tel_direct || person.tel_other || person.mobile || "",
                  dbId: agent.agentsdb_id || "",
                  jobTitle: person.job_title || "",
                  raw: { agent, person },
                });
              }
            });
          } else {
            // If no people, show the company itself (with PIC if available)
            allRows.push({
              type: "Agent",
              companyId: agent.id,
              personId: null,
              company: agent.name || "-",
              person: agent.agents_pic || agent.pic || "-",
              email: agent.email || agent.email2 || "",
              phone: agent.phone || agent.phone2 || "",
              dbId: agent.agentsdb_id || "",
              jobTitle: "",
              raw: { agent, person: null },
            });
          }
        });
      }

      setRows(allRows);
    } catch (error) {
      console.error("Error fetching phonebook data:", error);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [source, company, email, dbId, fetchAllCustomers, fetchAllAgents]);

  // Refetch when source changes immediately
  React.useEffect(() => {
    fetchData();
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce refetch when filter inputs change (company, email, dbId)
  const debounceRef = React.useRef(null);
  const prevFiltersRef = React.useRef({ company, email, dbId });
  React.useEffect(() => {
    const same =
      prevFiltersRef.current.company === company &&
      prevFiltersRef.current.email === email &&
      prevFiltersRef.current.dbId === dbId;
    prevFiltersRef.current = { company, email, dbId };
    if (same) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fetchData();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [company, email, dbId, fetchData]);

  // Client-side filters: phone and person name (from master data, no API)
  const filtered = React.useMemo(() => {
    const phoneQ = phone.trim().toLowerCase();
    const personQ = personName.trim().toLowerCase();
    if (!phoneQ && !personQ) return rows;
    return rows.filter((r) => {
      const matchesPhone = !phoneQ || (r.phone || "").toLowerCase().includes(phoneQ);
      const matchesPerson = !personQ || (r.person || "").toLowerCase().includes(personQ);
      return matchesPhone && matchesPerson;
    });
  }, [rows, phone, personName]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  React.useEffect(() => {
    setPage(1);
  }, [source, company, personName, email, phone, dbId]);

  const handleOpen = (row) => {
    if (row.type === "Client") {
      history.push(`/admin/contacts/customer/${row.companyId}`, { client: row.raw.client });
    } else {
      history.push(`/admin/contacts/agents/${row.companyId}`, { agent: row.raw.agent });
    }
  };

  const hasActiveFilters = company.trim() || personName.trim() || email.trim() || phone.trim() || dbId.trim();

  const handleClearAll = () => {
    setSource("all");
    setCompany("");
    setPersonName("");
    setEmail("");
    setPhone("");
    setDbId("");
    setPage(1);
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Card direction="column" w="100%" px="0px" overflowX={{ sm: "scroll", lg: "hidden" }}>
        <Flex px="25px" justify="space-between" mb="20px" align="center">
          <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
            Phonebook
          </Text>
        </Flex>

        <Box px="25px" pb="25px">
          <VStack spacing={4} align="stretch" border="1px" borderColor={borderColor} borderRadius="md" p={4}>
            <HStack spacing={4} flexWrap="wrap">
              <Select value={source} onChange={(e) => setSource(e.target.value)} w={{ base: "100%", md: "200px" }} minW={{ base: "0", md: "200px" }} bg={inputBg}>
                <option value="all">All</option>
                <option value="client">Client</option>
                <option value="agent">Agent</option>
              </Select>
              <Input placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} bg={inputBg} w={{ base: "100%", md: "200px" }} minW={{ base: "0", md: "200px" }} />
              <Input placeholder="People name" value={personName} onChange={(e) => setPersonName(e.target.value)} bg={inputBg} w={{ base: "100%", md: "200px" }} minW={{ base: "0", md: "200px" }} />
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} bg={inputBg} w={{ base: "100%", md: "200px" }} minW={{ base: "0", md: "200px" }} />
              <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} bg={inputBg} w={{ base: "100%", md: "200px" }} minW={{ base: "0", md: "200px" }} />
              <Input placeholder="DB ID / Code" value={dbId} onChange={(e) => setDbId(e.target.value)} bg={inputBg} w={{ base: "100%", md: "200px" }} minW={{ base: "0", md: "200px" }} />
              <Button leftIcon={<Icon as={MdSearch} />} onClick={fetchData} isLoading={isLoading} colorScheme="blue">Refresh</Button>
              {hasActiveFilters && (
                <Button leftIcon={<Icon as={MdClear} />} onClick={handleClearAll} variant="outline" colorScheme="red" _hover={{ bg: "red.50" }}>
                  Clear All
                </Button>
              )}
            </HStack>

            <Box border="1px" borderColor={borderColor} borderRadius="md" overflow="hidden" bg={tableScrollBg}>
              <Box maxH="500px" overflowY="auto" overflowX="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} zIndex={1} bg={theadBg} boxShadow="sm">
                    <Tr>
                      <Th bg={theadBg}>Type</Th>
                      <Th bg={theadBg}>Company</Th>
                      <Th bg={theadBg}>People</Th>
                      <Th bg={theadBg}>Email</Th>
                      <Th bg={theadBg}>Phone</Th>
                      <Th bg={theadBg}>DB ID</Th>
                      <Th bg={theadBg}>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {paginatedRows.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} textAlign="center" py={8}>
                          <Text color={emptyStateTextColor}>
                            {isLoading ? "Loading..." : "No contacts found"}
                          </Text>
                        </Td>
                      </Tr>
                    ) : (
                      paginatedRows.map((r, index) => (
                        <Tr key={`${r.type}-${r.companyId}-${r.personId || "main"}-${index}`}>
                          <Td>
                            <Tooltip
                              label={r.personId != null ? (r.type === "Client" ? "This is a client people" : "This is an agent people") : undefined}
                              isDisabled={r.personId == null}
                              hasArrow
                            >
                              <Badge
                                colorScheme={r.type === "Client" ? "blue" : "orange"}
                                variant="subtle"
                                fontSize="xs"
                                px={2}
                                py={0.5}
                                display="inline-flex"
                                alignItems="center"
                                gap={1}
                              >
                                {r.type}
                                {r.personId != null && <Icon as={MdPerson} boxSize={3} />}
                              </Badge>
                            </Tooltip>
                          </Td>
                          <Td>{r.company || "-"}</Td>
                          <Td>
                            {r.person || "-"}
                            {r.jobTitle && (
                              <Text fontSize="xs" color={jobTitleTextColor} mt={1}>
                                {r.jobTitle}
                              </Text>
                            )}
                          </Td>
                          <Td>{r.email || "-"}</Td>
                          <Td>{r.phone || "-"}</Td>
                          <Td>{r.dbId || "-"}</Td>
                          <Td>
                            <Button size="xs" leftIcon={<Icon as={MdOpenInNew} />} onClick={() => handleOpen(r)}>
                              Open
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
              {totalFiltered > 0 && (
                <Flex
                  px={4}
                  py={2}
                  borderTop="1px"
                  borderColor={borderColor}
                  align="center"
                  justify="space-between"
                  flexWrap="wrap"
                  gap={2}
                  bg={theadBg}
                >
                  <Text fontSize="sm" color={textColor}>
                    {totalFiltered} contact{totalFiltered !== 1 ? "s" : ""} · Page {currentPage} of {totalPages}
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      isDisabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      isDisabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </HStack>
                </Flex>
              )}
            </Box>
          </VStack>
        </Box>
      </Card>
    </Box>
  );
};

export default Phonebook;


