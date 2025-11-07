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
import { MdSearch, MdOpenInNew } from "react-icons/md";
import Card from "components/card/Card";
import { getCustomersApi } from "api/customer";
import { getVendorsApi } from "api/vendor";
import { useHistory } from "react-router-dom";

const Phonebook = () => {
  const history = useHistory();
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputBg = useColorModeValue("white", "navy.900");

  const [source, setSource] = React.useState("client"); // 'client' or 'agent'
  const [company, setCompany] = React.useState("");
  const [person, setPerson] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [dbId, setDbId] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      if (source === "client") {
        const data = await getCustomersApi();
        const list = Array.isArray(data?.customers) ? data.customers : Array.isArray(data) ? data : [];
        const mapped = list.map((c) => ({
          type: "Client",
          id: c.id,
          company: c.name || "",
          person: "", // people not fetched on list; left blank
          email: c.email || c.email2 || "",
          phone: c.phone || c.phone2 || "",
          dbId: c.client_code || "",
          raw: c,
        }));
        setRows(mapped);
      } else {
        const data = await getVendorsApi();
        const list = Array.isArray(data?.agents) ? data.agents : Array.isArray(data) ? data : [];
        const mapped = list.map((a) => ({
          type: "Agent",
          id: a.id,
          company: a.name || "",
          person: a.pic || "",
          email: a.email || a.email2 || "",
          phone: a.phone || a.phone2 || "",
          dbId: a.agentsdb_id || "",
          raw: a,
        }));
        setRows(mapped);
      }
    } finally {
      setIsLoading(false);
    }
  }, [source]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = React.useMemo(() => {
    const companyQ = company.trim().toLowerCase();
    const personQ = person.trim().toLowerCase();
    const emailQ = email.trim().toLowerCase();
    const dbQ = dbId.trim().toLowerCase();
    return rows.filter((r) => {
      return (
        (!companyQ || (r.company || "").toLowerCase().includes(companyQ)) &&
        (!personQ || (r.person || "").toLowerCase().includes(personQ)) &&
        (!emailQ || (r.email || "").toLowerCase().includes(emailQ)) &&
        (!dbQ || (r.dbId || "").toLowerCase().includes(dbQ))
      );
    });
  }, [rows, company, person, email, dbId]);

  const handleOpen = (row) => {
    if (row.type === "Client") {
      history.push(`/admin/contacts/customer/${row.id}`, { client: row.raw });
    } else {
      history.push(`/admin/contacts/agents/${row.id}`, { agent: row.raw });
    }
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
                <option value="client">Client</option>
                <option value="agent">Agent</option>
              </Select>
              <Input placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} bg={inputBg} w={{ base: "100%", md: "240px" }} />
              <Input placeholder="People name" value={person} onChange={(e) => setPerson(e.target.value)} bg={inputBg} w={{ base: "100%", md: "220px" }} />
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} bg={inputBg} w={{ base: "100%", md: "220px" }} />
              <Input placeholder="DB ID / Code" value={dbId} onChange={(e) => setDbId(e.target.value)} bg={inputBg} w={{ base: "100%", md: "200px" }} />
              <Button leftIcon={<Icon as={MdSearch} />} onClick={fetchData} isLoading={isLoading}>Refresh</Button>
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
                  {filtered.map((r) => (
                    <Tr key={`${r.type}-${r.id}`}>
                      <Td>{r.type}</Td>
                      <Td>{r.company || "-"}</Td>
                      <Td>{r.person || "-"}</Td>
                      <Td>{r.email || "-"}</Td>
                      <Td>{r.phone || "-"}</Td>
                      <Td>{r.dbId || "-"}</Td>
                      <Td>
                        <Button size="xs" leftIcon={<Icon as={MdOpenInNew} />} onClick={() => handleOpen(r)}>
                          Open
                        </Button>
                      </Td>
                    </Tr>
                  ))}
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


