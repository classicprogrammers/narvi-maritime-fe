import React from "react";
import { Box, Flex, Text, useColorModeValue } from "@chakra-ui/react";

export default function QuotationTotalsBar({ items = [], note }) {
  const bg = useColorModeValue("gray.50", "whiteAlpha.100");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const labelColor = useColorModeValue("gray.500", "gray.400");
  const valueColor = useColorModeValue("gray.800", "white");

  return (
    <Box bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="12px" px={4} py={3}>
      <Flex gap={6} wrap="wrap">
        {items.map((item) => (
          <Box key={item.label}>
            <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={labelColor} letterSpacing="0.04em">
              {item.label}
            </Text>
            <Text fontWeight={item.emphasis ? "700" : "600"} fontSize={item.emphasis ? "lg" : "md"} color={valueColor}>
              {item.value}
            </Text>
          </Box>
        ))}
      </Flex>
      {note ? (
        <Text mt={2} fontSize="xs" color={labelColor}>
          {note}
        </Text>
      ) : null}
    </Box>
  );
}
