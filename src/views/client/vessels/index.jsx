import React from "react";
import {
  Box,
  Flex,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdDirectionsBoat, MdSearch } from "react-icons/md";
import { useHistory } from "react-router-dom";

const vessels = [
  { name: "ACHI", owner: "MARTIN NARVI" },
  { name: "ADRE", owner: "MARTIN NARVI" },
  { name: "ALIKI PERROTIS", owner: "TASOS IANNATAS" },
  { name: "AMO", owner: "TASOS IANNATAS" },
  { name: "AQUA", owner: "MARTIN NARVI" },
  { name: "OCEAN STAR", owner: "MARTIN NARVI" },
];

function ClientVessels() {
  const history = useHistory();
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const text = useColorModeValue("navy.700", "white");

  return (
    <Box>
      <Heading color={text} mb={4} fontSize="24px" lineHeight="32px">
        Vessels
      </Heading>

      <InputGroup maxW="340px" mb={6}>
        <InputLeftElement pointerEvents="none">
          <Icon as={MdSearch} color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Search vessels..."
          borderRadius="12px"
          fontSize="sm"
          fontWeight="500"
        />
      </InputGroup>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {vessels.map((vessel) => (
          <Flex
            key={vessel.name}
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
                state: { selectedVessel: vessel.name },
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
                {vessel.owner}
              </Text>
            </Box>
          </Flex>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default ClientVessels;
