import React from "react";
import {
  Box,
  Grid,
  Text,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Heading,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  MdGroups,
  MdLocationOn,
  MdAttachMoney,
  MdStraighten,
} from "react-icons/md";
import { useHistory } from "react-router-dom";

const ConfigurationCard = ({ title, description, icon, path, color }) => {
  const history = useHistory();
  const cardBg = useColorModeValue("white", "gray.700");
  const cardBorder = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.50", "gray.600");

  return (
    <Box
      bg={cardBg}
      border="1px"
      borderColor={cardBorder}
      cursor="pointer"
      borderRadius="lg"
      p={6}
      _hover={{
        bg: hoverBg,
        transform: "translateY(-2px)",
        boxShadow: "lg",
      }}
      transition="all 0.2s"
      onClick={() => history.push(path)}
    >
      <VStack spacing={4} align="center">
        <Box
          p={3}
          borderRadius="full"
          bg={`${color}.100`}
          color={`${color}.600`}
        >
          <Icon as={icon} boxSize={8} />
        </Box>
        <VStack spacing={2} textAlign="center">
          <Heading size="md" color={useColorModeValue("gray.700", "white")}>
            {title}
          </Heading>
          <Text
            fontSize="sm"
            color={useColorModeValue("gray.600", "gray.300")}
          >
            {description}
          </Text>
        </VStack>
      </VStack>
    </Box>
  );
};

export default function Configurations() {
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const textColor = useColorModeValue("gray.700", "white");

  const configurationItems = [
    {
      title: "Groups",
      description: "Manage product and service groups",
      icon: MdGroups,
      path: "/admin/configurations/groups",
      color: "blue",
    },
    {
      title: "Locations",
      description: "Manage shipping and delivery locations",
      icon: MdLocationOn,
      path: "/admin/configurations/locations",
      color: "green",
    },
    {
      title: "Unit of Measurement",
      description: "Manage units of measurement",
      icon: MdStraighten,
      path: "/admin/configurations/uom",
      color: "purple",
    },
    {
      title: "Currencies",
      description: "Manage supported currencies",
      icon: MdAttachMoney,
      path: "/admin/configurations/currencies",
      color: "yellow",
    },
  ];

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        {/* Header Section */}
        <Box px="25px">
          <VStack align="start" spacing={1}>
            <Text fontSize="3xl" fontWeight="bold" color={textColor}>
              Configurations
            </Text>
            <Text fontSize="md" color={useColorModeValue("gray.600", "gray.400")}>
              Manage system configurations and master data
            </Text>
          </VStack>
        </Box>

        {/* Configuration Cards */}
        <Box px="25px">
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            {configurationItems.map((item, index) => (
              <ConfigurationCard key={index} {...item} />
            ))}
          </SimpleGrid>
        </Box>
      </VStack>
    </Box>
  );
}
