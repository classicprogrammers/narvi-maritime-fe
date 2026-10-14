import React from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { displayTariffValue } from "./tariffScreenUtils";

/**
 * Read-only paginated table shared by the Agent Tariffs and Client Tariffs screens.
 * columns: [{ key, label, isNumeric?, render?(row) }]
 */
export default function TariffTable({
  columns,
  rows,
  loading,
  emptyText,
  page,
  pageSize,
  totalCount,
  totalPages,
  hasNext,
  hasPrevious,
  fetchAll,
  onPageChange,
}) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const headerColor = useColorModeValue("gray.500", "gray.400");
  const textColor = useColorModeValue("gray.700", "white");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "gray.800");
  const rowBg = useColorModeValue("white", "gray.800");
  const rowBgAlt = useColorModeValue("gray.50", "whiteAlpha.50");
  const hoverBg = useColorModeValue("blue.50", "blue.900");

  const pageStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalCount);

  return (
    <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
      {loading ? (
        <Flex justify="center" py={16}>
          <Spinner />
        </Flex>
      ) : rows.length === 0 ? (
        <Flex justify="center" py={16} px={6}>
          <Text color={mutedColor} textAlign="center">
            {emptyText}
          </Text>
        </Flex>
      ) : (
        <>
          <Box overflowX="auto" overflowY="auto" maxH="620px">
            <Table size="sm" variant="simple">
              <Thead position="sticky" top={0} zIndex={1}>
                <Tr>
                  {columns.map((column) => (
                    <Th
                      key={column.key}
                      isNumeric={column.isNumeric}
                      py={3}
                      px={4}
                      fontSize="11px"
                      letterSpacing="0.06em"
                      color={headerColor}
                      bg={headerBg}
                      borderColor={borderColor}
                      whiteSpace="nowrap"
                      textTransform="uppercase"
                    >
                      {column.label}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, index) => (
                  <Tr
                    key={row.id ?? index}
                    bg={index % 2 === 0 ? rowBg : rowBgAlt}
                    _hover={{ bg: hoverBg }}
                  >
                    {columns.map((column) => {
                      const value = column.render ? column.render(row) : row[column.key];
                      return (
                        <Td
                          key={column.key}
                          isNumeric={column.isNumeric}
                          py={3}
                          px={4}
                          borderColor={borderColor}
                          fontSize="sm"
                          color={textColor}
                          fontWeight={column.isNumeric ? "700" : undefined}
                          wordBreak="break-word"
                        >
                          {displayTariffValue(value)}
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Flex
            justify="space-between"
            align="center"
            px={4}
            py={3}
            borderTop="1px"
            borderColor={borderColor}
            wrap="wrap"
            gap={3}
          >
            <Text fontSize="sm" color={mutedColor}>
              {fetchAll
                ? `Showing all ${rows.length} matching records (fetch all)`
                : `Showing ${pageStart}–${pageEnd} of ${totalCount}${totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}`}
            </Text>
            {!fetchAll && totalPages > 1 && (
              <HStack spacing={1}>
                <Button size="sm" variant="outline" onClick={() => onPageChange(1)} isDisabled={!hasPrevious}>
                  First
                </Button>
                <Button size="sm" variant="outline" onClick={() => onPageChange(page - 1)} isDisabled={!hasPrevious}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" onClick={() => onPageChange(page + 1)} isDisabled={!hasNext}>
                  Next
                </Button>
                <Button size="sm" variant="outline" onClick={() => onPageChange(totalPages)} isDisabled={!hasNext}>
                  Last
                </Button>
              </HStack>
            )}
          </Flex>
        </>
      )}
    </Box>
  );
}
