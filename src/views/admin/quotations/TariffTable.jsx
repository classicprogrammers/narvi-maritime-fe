import React from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Icon,
  IconButton,
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
import { MdDelete } from "react-icons/md";
import { displayTariffValue } from "./tariffScreenUtils";

/**
 * Paginated table shared by the Agent Tariffs and Client Tariffs screens.
 * columns: [{ key, label, isNumeric?, render?(row), renderCell?(row) }]
 * render(row) returns a raw value that is passed through displayTariffValue.
 * renderCell(row) returns a React node that is rendered as-is (takes precedence over render).
 * onDelete?(row): when given, each row gets a delete button.
 * selectedIds? + onSelectionChange?(ids): when both are given, rows get checkboxes.
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
  onDelete,
  selectedIds,
  onSelectionChange,
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

  const selectable = Boolean(selectedIds && onSelectionChange);
  const rowIds = rows.map((row) => row.id).filter((id) => id != null);
  const allSelected = selectable && rowIds.length > 0 && rowIds.every((id) => selectedIds.includes(id));
  const someSelected = selectable && rowIds.some((id) => selectedIds.includes(id));
  const toggleAll = () => onSelectionChange(allSelected ? [] : rowIds);
  const toggleRow = (id) =>
    onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  const pageStart =totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
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
                  {selectable && (
                    <Th py={3} px={4} bg={headerBg} borderColor={borderColor} w="1%">
                      <Checkbox
                        aria-label="Select all rows on this page"
                        isChecked={allSelected}
                        isIndeterminate={someSelected && !allSelected}
                        onChange={toggleAll}
                      />
                    </Th>
                  )}
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
                  {onDelete && (
                    <Th py={3} px={4} bg={headerBg} borderColor={borderColor} w="1%" aria-label="Actions" />
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, index) => (
                  <Tr
                    key={row.id ?? index}
                    bg={index % 2 === 0 ? rowBg : rowBgAlt}
                    _hover={{ bg: hoverBg }}
                  >
                    {selectable && (
                      <Td py={3} px={4} borderColor={borderColor}>
                        <Checkbox
                          aria-label="Select row"
                          isChecked={selectedIds.includes(row.id)}
                          onChange={() => toggleRow(row.id)}
                        />
                      </Td>
                    )}
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
                          {column.renderCell ? column.renderCell(row) : displayTariffValue(value)}
                        </Td>
                      );
                    })}
                    {onDelete && (
                      <Td py={3} px={4} borderColor={borderColor}>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Delete client tariff"
                          icon={<Icon as={MdDelete} />}
                          onClick={() => onDelete(row)}
                        />
                      </Td>
                    )}
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
