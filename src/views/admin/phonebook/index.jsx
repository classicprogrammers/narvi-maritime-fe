import React from "react";
import {
  Box,
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
  useColorModeValue,
} from "@chakra-ui/react";
import { MdSearch, MdOpenInNew, MdClear } from "react-icons/md";
import Card from "components/card/Card";
import { getCustomersApi } from "api/customer";
import { getVendorsApi } from "api/vendor";
import { useHistory } from "react-router-dom";

const Phonebook = () => {
  const history = useHistory();
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputBg = useColorModeValue("white", "navy.900");
  const emptyStateTextColor = useColorModeValue("gray.500", "gray.400");
  const jobTitleTextColor = useColorModeValue("gray.500", "gray.400");

  const [source, setSource] = React.useState("all"); // 'client', 'agent', or 'all'
  const [company, setCompany] = React.useState("");
  const [person, setPerson] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dbId, setDbId] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchAllCustomers = React.useCallback(async () => {
    const list = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await getCustomersApi({ page, page_size: 80, sort_by: "name", sort_order: "asc" });
      const batch = Array.isArray(res?.customers) ? res.customers : Array.isArray(res) ? res : [];
      list.push(...batch);
      hasMore = res?.has_next === true && batch.length > 0;
      page += 1;
    }
    return list;
  }, []);

  const fetchAllAgents = React.useCallback(async () => {
    const list = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await getVendorsApi({ page, page_size: 80, sort_by: "name", sort_order: "asc" });
      const batch = Array.isArray(res?.agents)
        ? res.agents
        : Array.isArray(res?.vendors)
          ? res.vendors
          : Array.isArray(res)
            ? res
            : [];
      list.push(...batch);
      hasMore = res?.has_next === true && batch.length > 0;
      page += 1;
    }
    return list;
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const allRows = [];

      if (source === "client" || source === "all") {
        const clientList = await fetchAllCustomers();

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
        const agentList = await fetchAllAgents();

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
  }, [source, fetchAllCustomers, fetchAllAgents]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = React.useMemo(() => {
    const companyQ = company.trim().toLowerCase();
    const personQ = person.trim().toLowerCase();
    const emailQ = email.trim().toLowerCase();
    const phoneQ = phone.trim().toLowerCase();
    const dbQ = dbId.trim().toLowerCase();
    return rows.filter((r) => {
      return (
        (!companyQ || (r.company || "").toLowerCase().includes(companyQ)) &&
        (!personQ || (r.person || "").toLowerCase().includes(personQ)) &&
        (!emailQ || (r.email || "").toLowerCase().includes(emailQ)) &&
        (!phoneQ || (r.phone || "").toLowerCase().includes(phoneQ)) &&
        (!dbQ || (r.dbId || "").toLowerCase().includes(dbQ))
      );
    });
  }, [rows, company, person, email, phone, dbId]);

  const handleOpen = (row) => {
    if (row.type === "Client") {
      history.push(`/admin/contacts/customer/${row.companyId}`, { client: row.raw.client });
    } else {
      history.push(`/admin/contacts/agents/${row.companyId}`, { agent: row.raw.agent });
    }
  };

  const hasActiveFilters = source !== "all" || company.trim() || person.trim() || email.trim() || phone.trim() || dbId.trim();

  const handleClearAll = () => {
    setSource("all");
    setCompany("");
    setPerson("");
    setEmail("");
    setPhone("");
    setDbId("");
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
              <Select value={source} onChange={(e) => setSource(e.target.value)} w={{ base: "100%", md: "200px" }} bg={inputBg}>
                <option value="all">All</option>
                <option value="client">Client</option>
                <option value="agent">Agent</option>
              </Select>
              <Input placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} bg={inputBg} w={{ base: "100%", md: "200px" }} />
              <Input placeholder="People name" value={person} onChange={(e) => setPerson(e.target.value)} bg={inputBg} w={{ base: "100%", md: "180px" }} />
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} bg={inputBg} w={{ base: "100%", md: "200px" }} />
              <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} bg={inputBg} w={{ base: "100%", md: "180px" }} />
              <Input placeholder="DB ID / Code" value={dbId} onChange={(e) => setDbId(e.target.value)} bg={inputBg} w={{ base: "100%", md: "150px" }} />
              <Button leftIcon={<Icon as={MdSearch} />} onClick={fetchData} isLoading={isLoading} colorScheme="blue">Refresh</Button>
              {hasActiveFilters && (
                <Button leftIcon={<Icon as={MdClear} />} onClick={handleClearAll} variant="outline" colorScheme="red" _hover={{ bg: "red.50" }}>
                  Clear All
                </Button>
              )}
            </HStack>

            <Box border="1px" borderColor={borderColor} borderRadius="md" overflow="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Type</Th>
                    <Th>Company</Th>
                    <Th>People</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>DB ID</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filtered.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} textAlign="center" py={8}>
                        <Text color={emptyStateTextColor}>
                          {isLoading ? "Loading..." : "No contacts found"}
                        </Text>
                      </Td>
                    </Tr>
                  ) : (
                    filtered.map((r, index) => (
                      <Tr key={`${r.type}-${r.companyId}-${r.personId || 'main'}-${index}`}>
                        <Td>{r.type}</Td>
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
          </VStack>
        </Box>
      </Card>
    </Box>
  );
};

export default Phonebook;


