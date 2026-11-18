import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdClose,
  MdDelete,
  MdEdit,
  MdFilterList,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdSearch,
  MdUnfoldMore,
} from "react-icons/md";

import Card from "components/card/Card";
import DmyDateInput, { normalizeToIsoDate } from "components/forms/DmyDateInput";
import { SALES_DATE_FILTER_FIELDS, formatIsoToDdMmYy } from "utils/salesNotes";

// header, sort key (null = not sortable), min width
const COLUMNS = [
  { header: "Entry date", sortKey: "entry_date", minW: "110px" },
  { header: "Client", sortKey: "client", minW: "180px" },
  { header: "Client code", sortKey: null, minW: "120px" },
  { header: "Follow up", sortKey: null, minW: "100px" },
  { header: "Remarks", sortKey: null, minW: "260px" },
  { header: "Follow-up date", sortKey: "follow_up_date", minW: "130px" },
  { header: "Created by", sortKey: "created_by", minW: "140px" },
  { header: "Actions", sortKey: null, minW: "100px" },
];

const text = (value) => (value == null || value === false || value === "" ? "-" : String(value));
const dateText = (iso) => formatIsoToDdMmYy(iso) || "-";

export default function SalesNotesTable({
  rows = [],
  isLoading = false,
  error = "",
  pagination,
  searchValue,
  onSearchChange,
  dateRanges,
  dateErrors = {},
  onDateChange,
  sort,
  onSort,
  onPageChange,
  hasActiveFilters = false,
  hasAnyFilterState = false,
  onClearAll,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [showFilterFields, setShowFilterFields] = useState(() => hasActiveFilters);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const expandableFilterBg = useColorModeValue("gray.50", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
  const hoverBg = useColorModeValue("blue.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const scrollTrack = useColorModeValue("#f1f1f1", "#2d3748");
  const scrollThumb = useColorModeValue("#c1c1c1", "#4a5568");
  const scrollThumbHover = useColorModeValue("#a8a8a8", "#718096");

  const page = pagination?.page || 1;
  const pageSize = pagination?.page_size || 50;
  const totalCount = pagination?.total_count || 0;
  const totalPages = pagination?.total_pages || 1;

  const focusStyle = {
    borderColor: "blue.400",
    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
  };

  const renderDateField = (name, label) => (
    <Box minW="180px" flex="1">
      <Text fontSize="xs" color={tableTextColorSecondary} mb={1}>
        {label}
      </Text>
      <HStack spacing={1}>
        <Box flex="1">
          <DmyDateInput
            id={`sales-filter-${name}`}
            value={dateRanges?.[name] ?? ""}
            onChange={(value) => onDateChange(name, normalizeToIsoDate(value))}
            iconColor={tableTextColorSecondary}
            bg={inputBg}
            color={inputText}
            fontSize="sm"
            border="2px"
            borderColor={borderColor}
            borderRadius="8px"
            _placeholder={{ color: placeholderColor, fontSize: "14px" }}
            _focus={focusStyle}
          />
        </Box>
        {dateRanges?.[name] ? (
          <IconButton
            aria-label={`Clear ${label}`}
            size="xs"
            variant="ghost"
            icon={<Icon as={MdClose} />}
            onClick={() => onDateChange(name, "")}
          />
        ) : null}
      </HStack>
    </Box>
  );

  const renderCell = (row) => {
    const clientName = row.client_id?.name ?? row.client_name;
    const clientCode = row.client_code ?? row.client_id?.client_code;
    const followUp = !!row.client_follow_up;
    const remarks = row.remarks ? String(row.remarks) : "";
    return [
      dateText(row.entry_date),
      text(clientName),
      text(clientCode),
      <Badge key="fu" colorScheme={followUp ? "green" : "gray"}>
        {followUp ? "Yes" : "No"}
      </Badge>,
      remarks ? (
        <Tooltip label={remarks} placement="top-start" hasArrow whiteSpace="pre-wrap" maxW="420px">
          <Text noOfLines={2} maxW="360px">
            {remarks}
          </Text>
        </Tooltip>
      ) : (
        "-"
      ),
      dateText(row.follow_up_date),
      text(row.created_by?.name),
    ];
  };

  return (
    <Card direction="column" w="100%" px="0px" overflowX={{ sm: "scroll", lg: "hidden" }}>
      <Flex px="25px" justify="space-between" mb="20px" align="center">
        <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
          Sales Notes
        </Text>
        <Button leftIcon={<Icon as={MdAdd} />} colorScheme="blue" size="sm" onClick={onAdd}>
          Add Note
        </Button>
      </Flex>

      <Box
        px="25px"
        mb="20px"
        mx="15px"
        bg={inputBg}
        borderRadius="16px"
        p="24px"
        border="1px"
        borderColor={borderColor}
      >
        <HStack spacing={6} justify="space-between" align="center" flexWrap="wrap" mb={4}>
          <Box flex="1" minW="240px">
            <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
              Search
            </Text>
            <InputGroup>
              <InputLeftElement>
                <Icon as={MdSearch} color="blue.500" w="16px" h="16px" />
              </InputLeftElement>
              <Input
                variant="outline"
                fontSize="sm"
                bg={inputBg}
                color={inputText}
                fontWeight="500"
                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                borderRadius="10px"
                placeholder="Search sales notes..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                border="2px"
                borderColor={borderColor}
                _focus={focusStyle}
                _hover={{ borderColor: "blue.300" }}
                pr={searchValue ? "32px" : undefined}
              />
              {searchValue && (
                <InputRightElement width="32px">
                  <IconButton
                    aria-label="Clear search"
                    size="xs"
                    variant="ghost"
                    icon={<Icon as={MdClose} />}
                    onClick={() => onSearchChange("")}
                    _hover={{ bg: "gray.200" }}
                  />
                </InputRightElement>
              )}
            </InputGroup>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
              &nbsp;
            </Text>
            {hasAnyFilterState && (
              <Button
                size="md"
                variant="outline"
                onClick={onClearAll}
                colorScheme="red"
                _hover={{ bg: "red.50" }}
                borderRadius="10px"
                border="2px"
              >
                Clear All
              </Button>
            )}
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
              Advanced Filters
            </Text>
            <Button
              size="md"
              variant={hasActiveFilters ? "solid" : "outline"}
              colorScheme={hasActiveFilters ? "blue" : "gray"}
              leftIcon={<Icon as={MdFilterList} />}
              onClick={() => setShowFilterFields(!showFilterFields)}
              borderRadius="10px"
              border="2px"
              borderColor={borderColor}
            >
              {showFilterFields ? "Hide Filters" : "Show Filters"}
            </Button>
          </Box>
        </HStack>

        {showFilterFields && (
          <Box
            mt={4}
            pt={4}
            borderTop="2px"
            borderColor={borderColor}
            bg={expandableFilterBg}
            borderRadius="12px"
            p="20px"
          >
            <Text fontSize="sm" fontWeight="600" color={textColor} mb={4}>
              Filter by Dates
            </Text>
            <HStack spacing={6} flexWrap="wrap" align="flex-start">
              {SALES_DATE_FILTER_FIELDS.map(({ key, label }) => (
                <Box key={key} minW="380px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    {label}
                  </Text>
                  <HStack spacing={3} align="flex-start">
                    {renderDateField(`${key}_from`, "From")}
                    {renderDateField(`${key}_to`, "To")}
                  </HStack>
                  {dateErrors[key] ? (
                    <Text fontSize="xs" color="red.500" mt={1} role="alert">
                      {dateErrors[key]}
                    </Text>
                  ) : null}
                </Box>
              ))}
            </HStack>
          </Box>
        )}
      </Box>

      <Box
        px="15px"
        maxH="600px"
        overflowX="auto"
        overflowY="auto"
        css={{
          "&::-webkit-scrollbar": { width: "8px", height: "8px" },
          "&::-webkit-scrollbar-track": { background: scrollTrack, borderRadius: "4px" },
          "&::-webkit-scrollbar-thumb": { background: scrollThumb, borderRadius: "4px" },
          "&::-webkit-scrollbar-thumb:hover": { background: scrollThumbHover },
        }}
      >
        <Table variant="unstyled" size="sm" minW="900px">
          <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={1}>
            <Tr>
              {COLUMNS.map((column) => {
                const sortable = !!column.sortKey;
                const isActive = sortable && sort?.sortBy === column.sortKey;
                return (
                  <Th
                    key={column.header}
                    border="1px"
                    borderColor={tableBorderColor}
                    py="12px"
                    px="16px"
                    fontSize="12px"
                    fontWeight="600"
                    color={tableTextColor}
                    textTransform="uppercase"
                    cursor={sortable ? "pointer" : "default"}
                    minW={column.minW}
                    onClick={sortable ? () => onSort(column.sortKey) : undefined}
                    aria-sort={
                      isActive ? (sort.sortOrder === "asc" ? "ascending" : "descending") : undefined
                    }
                  >
                    <Flex justify="space-between" align="center">
                      {column.header}
                      {sortable && (
                        <Icon
                          as={
                            isActive
                              ? sort.sortOrder === "asc"
                                ? MdKeyboardArrowUp
                                : MdKeyboardArrowDown
                              : MdUnfoldMore
                          }
                          color={isActive ? "blue.500" : tableTextColorSecondary}
                          boxSize={4}
                          ml={2}
                        />
                      )}
                    </Flex>
                  </Th>
                );
              })}
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <Tr>
                <Td colSpan={COLUMNS.length} textAlign="center" py="40px">
                  <Text color={tableTextColorSecondary} fontSize="sm">
                    Loading sales notes...
                  </Text>
                </Td>
              </Tr>
            ) : error ? (
              <Tr>
                <Td colSpan={COLUMNS.length} textAlign="center" py="40px">
                  <Text color="red.500" fontSize="sm" role="alert">
                    {error}
                  </Text>
                </Td>
              </Tr>
            ) : rows.length === 0 ? (
              <Tr>
                <Td colSpan={COLUMNS.length} textAlign="center" py="40px">
                  <Text color={tableTextColorSecondary} fontSize="sm">
                    {String(searchValue || "").trim() || hasActiveFilters ? "No sales notes match your filters." : "No sales notes yet."}
                  </Text>
                </Td>
              </Tr>
            ) : (
              rows.map((row, index) => (
                <Tr
                  key={row.id ?? index}
                  bg={index % 2 === 0 ? tableRowBg : tableRowBgAlt}
                  _hover={{ bg: hoverBg }}
                  border="1px"
                  borderColor={tableBorderColor}
                >
                  {renderCell(row).map((cell, cellIndex) => (
                    <Td
                      key={COLUMNS[cellIndex].header}
                      fontSize="sm"
                      color={tableTextColor}
                      border="1px"
                      borderColor={tableBorderColor}
                      py="12px"
                      px="16px"
                      verticalAlign="top"
                    >
                      {cell}
                    </Td>
                  ))}
                  <Td border="1px" borderColor={tableBorderColor} py="12px" px="16px">
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="Edit sales note"
                        size="sm"
                        variant="ghost"
                        colorScheme="blue"
                        icon={<Icon as={MdEdit} />}
                        onClick={() => onEdit(row)}
                      />
                      <IconButton
                        aria-label="Delete sales note"
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        icon={<Icon as={MdDelete} />}
                        onClick={() => onDelete(row)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      <Flex px="25px" justify="space-between" align="center" py="20px" flexWrap="wrap" gap={4}>
        <Text fontSize="sm" color={tableTextColorSecondary}>
          Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, totalCount)} of {totalCount} results
        </Text>

        <HStack spacing={4} align="center" flexWrap="wrap">
          <HStack spacing={1}>
            <Button
              size="sm"
              onClick={() => onPageChange(1)}
              isDisabled={!pagination?.has_previous}
              variant="outline"
              aria-label="First page"
            >
              ««
            </Button>
            <Button
              size="sm"
              onClick={() => onPageChange(page - 1)}
              isDisabled={!pagination?.has_previous}
              variant="outline"
              aria-label="Previous page"
            >
              «
            </Button>

            {(() => {
              const pageNumbers = [];
              const maxVisiblePages = 5;
              let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
              const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
              for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(
                  <Button
                    key={i}
                    size="sm"
                    onClick={() => onPageChange(i)}
                    variant={i === page ? "solid" : "outline"}
                    colorScheme={i === page ? "blue" : "gray"}
                    minW="40px"
                    aria-label={`Page ${i}`}
                  >
                    {i}
                  </Button>
                );
              }
              return pageNumbers;
            })()}

            <Button
              size="sm"
              onClick={() => onPageChange(page + 1)}
              isDisabled={!pagination?.has_next}
              variant="outline"
              aria-label="Next page"
            >
              »
            </Button>
            <Button
              size="sm"
              onClick={() => onPageChange(totalPages)}
              isDisabled={!pagination?.has_next}
              variant="outline"
              aria-label="Last page"
            >
              »»
            </Button>
          </HStack>
          <Text fontSize="sm" color={tableTextColorSecondary}>
            Page {page} of {totalPages}
          </Text>
        </HStack>
      </Flex>
    </Card>
  );
}
