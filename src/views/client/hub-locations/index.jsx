import React from "react";
import { Box, Flex, Heading, Icon, SimpleGrid, Text, useColorModeValue } from "@chakra-ui/react";
import { MdLocationOn } from "react-icons/md";

const hubs = [
  { name: "Singapore Hub", code: "SG-HUB-01", status: "Operational" },
  { name: "Shanghai Hub", code: "CN-HUB-03", status: "Operational" },
  { name: "Rotterdam Hub", code: "NL-HUB-02", status: "Limited Capacity" },
];

function ClientHubLocations() {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");

  return (
    <Box>
      <Heading fontSize="24px" lineHeight="32px" color={headingColor}>
        Hub Locations
      </Heading>
      <Text mt={1} mb={5} fontSize="sm" color={muted}>
        Active operating hubs across your network.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
        {hubs.map((hub) => (
          <Box key={hub.code} bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={4}>
            <Flex align="center" gap={2} mb={2}>
              <Icon as={MdLocationOn} color="brand.500" />
              <Text fontWeight="700" fontSize="sm">{hub.name}</Text>
            </Flex>
            <Text fontSize="xs" color={muted}>Code: {hub.code}</Text>
            <Text mt={1} fontSize="sm" color="green.500" fontWeight="600">{hub.status}</Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default ClientHubLocations;
