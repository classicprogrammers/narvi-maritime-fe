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
import { MdDirectionsBoat, MdSearch } from "react-icons/md";
import { useHistory } from "react-router-dom";
import clientVesselApi from "api/clientVessel";

function ClientVessels() {
  const history = useHistory();
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const text = useColorModeValue("navy.700", "white");
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [clientName, setClientName] = useState("");
  const [vessels, setVessels] = useState([]);

  const fetchClientVessels = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await clientVesselApi.getClientVessels({
        search: search.trim() || undefined,
      });
      setVessels(Array.isArray(res?.vessels) ? res.vessels : []);
      setClientName(res?.client?.name || "");
    } catch (_error) {
      setVessels([]);
      setClientName("");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClientVessels();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchClientVessels]);

  const headingText = useMemo(() => {
    if (!clientName) return "Vessels";
    return `Vessels - ${clientName}`;
  }, [clientName]);

  return (
    <Box>
      <Heading color={text} mb={4} fontSize="24px" lineHeight="32px">
        {headingText}
      </Heading>

      <Flex gap={3} mb={6} direction={{ base: "column", md: "row" }}>
        <InputGroup maxW={{ base: "100%", md: "340px" }}>
          <InputLeftElement pointerEvents="none">
            <Icon as={MdSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vessels..."
            borderRadius="12px"
            fontSize="sm"
            fontWeight="500"
          />
        </InputGroup>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {isLoading && (
          <Flex align="center" gap={2}>
            <Spinner size="sm" />
            <Text color={muted} fontSize="sm">Loading vessels...</Text>
          </Flex>
        )}
        {!isLoading && vessels.length === 0 && (
          <Text color={muted} fontSize="sm">No vessels found for your account.</Text>
        )}
        {vessels.map((vessel) => (
          <Flex
            key={vessel.id || vessel.name}
            align="center"
            gap={3}
            p={4}
            border="1px solid"
            borderColor={borderColor}
            bg={cardBg}
            borderRadius="14px"
            boxShadow="0 14px 30px rgba(112, 144, 176, 0.08)"
            cursor="pointer"
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "0 20px 36px rgba(112, 144, 176, 0.16)",
            }}
            transition="all 0.2s ease"
            onClick={() =>
              history.push({
                pathname: "/Client/Stock",
                state: { selectedVessel: vessel.name, selectedVesselId: vessel.id },
              })
            }
          >
            <Flex
              align="center"
              justify="center"
              borderRadius="10px"
              bg="secondaryGray.300"
              color="brand.500"
              w="34px"
              h="34px"
              flexShrink={0}
            >
              <Icon as={MdDirectionsBoat} />
            </Flex>
            <Box>
              <Text fontWeight="700" color={text} fontSize="sm">
                {vessel.name}
              </Text>
              <Text fontSize="xs" fontWeight="500" color={muted}>
                {vessel.client_id?.name || clientName || "-"}
              </Text>
            </Box>
          </Flex>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default ClientVessels;
