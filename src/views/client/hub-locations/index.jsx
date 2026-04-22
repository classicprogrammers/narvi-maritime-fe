import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdLocationOn, MdSearch } from "react-icons/md";
import clientHubApi from "api/clientHub";

function ClientHubLocations() {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [clientName, setClientName] = useState("");
  const [hubs, setHubs] = useState([]);

  const fetchHubs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await clientHubApi.getClientHubs({
        search: search.trim() || undefined,
      });
      setHubs(Array.isArray(res?.hubs) ? res.hubs : []);
      setClientName(res?.client?.name || "");
    } catch (_error) {
      setHubs([]);
      setClientName("");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHubs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchHubs]);

  const pageTitle = useMemo(() => {
    if (!clientName) return "Hub Locations";
    return `Hub Locations - ${clientName}`;
  }, [clientName]);

  return (
    <Box>
      <Heading fontSize="24px" lineHeight="32px" color={headingColor}>
        {pageTitle}
      </Heading>
      <Text mt={1} mb={5} fontSize="sm" color={muted}>
        Hub values from your client stock records.
      </Text>

      <InputGroup maxW="340px" mb={6}>
        <InputLeftElement pointerEvents="none">
          <Icon as={MdSearch} color="gray.400" />
        </InputLeftElement>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search hub..."
          borderRadius="12px"
          fontSize="sm"
          fontWeight="500"
        />
      </InputGroup>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
        {isLoading && (
          <Flex align="center" gap={2}>
            <Spinner size="sm" />
            <Text color={muted} fontSize="sm">Loading hubs...</Text>
          </Flex>
        )}
        {!isLoading && hubs.length === 0 && (
          <Text color={muted} fontSize="sm">No hub locations found.</Text>
        )}
        {hubs.map((hub) => (
          <Box
            key={hub.hub}
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="16px"
            p={4}
          >
            <Flex align="center" gap={2} mb={2}>
              <Icon as={MdLocationOn} color="brand.500" />
              <Text fontWeight="700" fontSize="sm">{hub.hub || "-"}</Text>
            </Flex>
            <Text fontSize="xs" color={muted}>Client hub value</Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default ClientHubLocations;
