import {
  Flex,
  Table,
  Icon,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  HStack,
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  useDisclosure,
  VStack,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Select,
  Grid,
  Textarea,
} from "@chakra-ui/react";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { useUser } from "../../../../redux/hooks/useUser";
import {
  useGlobalFilter,
  useSortBy,
  useTable,
} from "react-table";

import Card from "components/card/Card";
import SearchableSelect from "components/forms/SearchableSelect";
import { useCustomer } from "redux/hooks/useCustomer";
import { SuccessModal } from "components/modals";
import { useMasterData } from "../../../../hooks/useMasterData";
import { refreshMasterData, MASTER_KEYS } from "../../../../utils/masterDataCache";

import {
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdUnfoldMore,
  MdFilterList,
  MdVisibility,
  MdPeople,
  MdClose,
} from "react-icons/md";

export default function CustomerTable(props) {
  const {
    columnsData,
    tableData,
    isLoading = false,
    pagination,
    page = 1,
    pageSize = 80,
    onPageChange,
    searchValue: propsSearchValue,
    onSearchChange: propsOnSearchChange,
    filters: propsFilters,
    onFilterChange: propsOnFilterChange,
    onClearAll: propsOnClearAll,
    onRefresh: propsOnRefresh,
    onSearch: propsOnSearch,
    sortOrder: propsSortOrder,
    onSortOrderChange: propsOnSortOrderChange,
  } = props;
  const history = useHistory();
  const [internalSearch, setInternalSearch] = useState("");
  const [internalFilters, setInternalFilters] = useState({
    client_code: "",
    email: "",
  });
  const isControlled = propsSearchValue !== undefined && propsOnSearchChange != null && propsFilters !== undefined && propsOnFilterChange != null;
  const searchValue = isControlled ? propsSearchValue : internalSearch;
  const setSearchValue = isControlled ? propsOnSearchChange : setInternalSearch;
  const filters = isControlled ? propsFilters : internalFilters;
  const setFiltersOrNotify = isControlled
    ? (field, value) => propsOnFilterChange(field, value)
    : (field, value) => setInternalFilters((prev) => ({ ...prev, [field]: value }));
  const sortOrderControlled = propsSortOrder !== undefined && propsOnSortOrderChange != null;
  const [internalSortOrder, setInternalSortOrder] = useState("alphabetical");
  const sortOrder = sortOrderControlled ? propsSortOrder : internalSortOrder;
  const setSortOrder = sortOrderControlled ? propsOnSortOrderChange : setInternalSortOrder;
  const [showFilterFields, setShowFilterFields] = useState(false);

  const hasAnyAdvanceFilter = filters.client_code || filters.email || filters.country;
  useEffect(() => {
    if (hasAnyAdvanceFilter) setShowFilterFields(true);
  }, [hasAnyAdvanceFilter]);

  const {
    updateCustomer,
    deleteCustomer,
    updateLoading,
    deleteLoading,
    getCustomers,
  } = useCustomer();

  const { countries } = useMasterData();
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const {
    isOpen: isEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const cancelRef = useRef();

  const { user } = useUser();
  const isAdmin = user?.user_type === "admin";

  const columns = useMemo(() => columnsData, [columnsData]);

  const applyCustomSorting = (data) => {
    if (sortOrder === "newest") {
      return [...data].sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));
    } else if (sortOrder === "oldest") {
      return [...data].sort((a, b) => new Date(a.created_at || a.id) - new Date(b.created_at || b.id));
    } else if (sortOrder === "alphabetical") {
      return [...data].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return data;
  };

  const filteredCustomers = useMemo(() => {
    let filtered = Array.isArray(tableData) ? [...tableData] : [];

    filtered = filtered.filter((item) =>
      item.parent_id === false || item.parent_id === null || item.parent_id === undefined
    );

    if (!isControlled) {
      if (searchValue) {
        filtered = filtered.filter(
          (item) =>
            item.name &&
            item.name.toLowerCase().includes(searchValue.toLowerCase())
        );
      }
      if (filters.client_code) {
        filtered = filtered.filter(
          (item) =>
            item.client_code &&
            item.client_code.toLowerCase().includes(filters.client_code.toLowerCase())
        );
      }
      if (filters.email) {
        filtered = filtered.filter(
          (item) =>
            (item.email && item.email.toLowerCase().includes(filters.email.toLowerCase())) ||
            (item.email2 && item.email2.toLowerCase().includes(filters.email.toLowerCase()))
        );
      }
    }

    return filtered.map((item) => {
      const emails = [item.email, item.email2]
        .filter(Boolean)
        .join(", ");

      const childrenArray = Array.isArray(item.children) ? item.children : [];
      const childrenCount = childrenArray.length;

      const normalizedChildren = childrenArray.map((child, index) => {
        const fullName =
          child?.name ||
          [child?.first_name, child?.last_name].filter(Boolean).join(" ");

        const jobTitle =
          child?.jobTitle ||
          child?.job_title ||
          child?.position ||
          child?.title ||
          "";

        const email =
          child?.email ||
          child?.email1 ||
          child?.email2 ||
          child?.primary_email ||
          "";

        const phone =
          child?.tel_direct ||
          child?.phone ||
          child?.tel_other ||
          child?.mobile ||
          "";

        return {
          id:
            child?.id ||
            child?.person_id ||
            child?.contact_id ||
            `${fullName || email || phone || index}-${index}`,
          name: fullName || email || phone || "Unnamed Contact",
          jobTitle,
          email,
          phone,
        };
      });

      return {
        ...item,
        location: [item.city, item.country_name || item.country?.name]
          .filter(Boolean)
          .join(", "),
        emails: emails || "-",
        children_count: childrenCount,
        children_display: normalizedChildren,
      };
    });
  }, [tableData, searchValue, filters, isControlled]);

  const data = useMemo(() => {
    if (isControlled) return filteredCustomers;
    return applyCustomSorting(filteredCustomers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCustomers, sortOrder, isControlled]);

  const tableInstance = useTable(
    {
      columns,
      data,
      manualPagination: true,
    },
    useGlobalFilter,
    useSortBy
  );

  const {
    getTableProps,
    headerGroups,
    rows: tableRows,
    prepareRow,
  } = tableInstance;

  const paginationData = pagination || {
    page: page || 1,
    page_size: pageSize || 80,
    total_count: tableData.length || 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  };

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const hoverBg = useColorModeValue("blue.50", "gray.700");
  const expandableFilterBg = useColorModeValue("gray.50", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
  const modalBg = useColorModeValue("white", "gray.800");
  const modalHeaderBg = useColorModeValue("gray.50", "gray.700");
  const modalBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");

  const handleFilterChange = (field, value) => {
    setFiltersOrNotify(field, value);
  };

  const clearAllFilters = () => {
    if (isControlled && propsOnClearAll) {
      propsOnClearAll();
    } else {
      setInternalFilters({ client_code: "", email: "" });
      setInternalSearch("");
    }
  };

  const clearAllSorting = () => {
    tableInstance.setSortBy([]);
  };

  const clearAllFiltersAndSorting = () => {
    clearAllFilters();
    clearAllSorting();
    if (!isControlled) setSearchValue("");
    if (!sortOrderControlled) setSortOrder("alphabetical");
  };


  const handleEditInputChange = (field, value) => {
    setEditingCustomer((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const createNumberedListHandler = (field) => {
    return (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const currentText = e.target.value;
        const cursorPosition = e.target.selectionStart;

        const textBeforeCursor = currentText.substring(0, cursorPosition);
        const textAfterCursor = currentText.substring(cursorPosition);

        const lastNewlineIndex = textBeforeCursor.lastIndexOf("\n");
        const currentLine = textBeforeCursor.substring(lastNewlineIndex + 1);

        if (!currentLine.trim()) {
          const newValue = textBeforeCursor + "\n" + textAfterCursor;
          handleEditInputChange(field, newValue);
          setTimeout(() => {
            e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1;
          }, 0);
          return;
        }

        const allLines = currentText.split("\n");
        let maxNumber = 0;

        allLines.forEach(line => {
          const match = line.trim().match(/^(\d+)\.\s/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        });

        const trimmedCurrentLine = currentLine.trim();
        const hasNumberPrefix = /^\d+\.\s/.test(trimmedCurrentLine);

        let newLine;
        if (hasNumberPrefix) {
          newLine = currentLine;
        } else {
          const nextNumber = maxNumber + 1;
          const leadingWhitespace = currentLine.match(/^\s*/)?.[0] || "";
          const lineContent = trimmedCurrentLine;
          newLine = leadingWhitespace + `${nextNumber}. ${lineContent}`;
        }

        const linesBefore = lastNewlineIndex >= 0
          ? textBeforeCursor.substring(0, lastNewlineIndex + 1)
          : "";
        const newValue = linesBefore + newLine + "\n" + textAfterCursor;

        handleEditInputChange(field, newValue);

        setTimeout(() => {
          e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1 + (newLine.length - currentLine.length) + 1;
        }, 0);
      }
    };
  };


  const handleSaveEdit = async () => {
    try {
      if (!editingCustomer || !editingCustomer.id) {
        onEditClose();
        setEditingCustomer(null);
        return;
      }

      const originalCustomer = tableData.find(
        (c) => c.id === editingCustomer.id
      );

      if (!originalCustomer) {
        onEditClose();
        setEditingCustomer(null);
        return;
      }

      if (!editingCustomer.name || editingCustomer.name.trim() === "") {
        return;
      }
      if (!editingCustomer.client_code || editingCustomer.client_code.trim() === "") {
        return;
      }
      if (!editingCustomer.client_category || editingCustomer.client_category.trim() === "") {
        return;
      }

      const hasChanges = Object.keys(editingCustomer).some(
        (key) => editingCustomer[key] !== originalCustomer[key]
      );

      if (!hasChanges) {
        onEditClose();
        setEditingCustomer(null);
        return;
      }

      const result = await updateCustomer(editingCustomer.id, editingCustomer);

      if (result.success) {
        onEditClose();
        setEditingCustomer(null);
        setSuccessMessage("Client updated successfully!");
        setIsSuccessOpen(true);
        refreshMasterData(MASTER_KEYS.CLIENTS).catch(() => {});
        if (propsOnRefresh) propsOnRefresh();
        else getCustomers({});
      }
    } catch (error) {
    }
  };

  const handleEdit = (customer) => {
    if (!customer || !customer.id) return;

    const original = Array.isArray(tableData)
      ? tableData.find((item) => {
        const itemId = item.id;
        const customerId = customer.id;
        return String(itemId) === String(customerId) || itemId === customerId;
      })
      : null;

    const payload = original || customer;

    history.push('/admin/customer-registration', {
      client: payload,
      clientId: payload.id
    });
  };

  const handleDelete = (customer) => {
    if (!customer || !customer.id) {
      return;
    }
    setCustomerToDelete(customer);
    onDeleteOpen();
  };

  const handleView = (customer) => {
    if (!customer || !customer.id) return;

    const original = Array.isArray(tableData)
      ? tableData.find((item) => {
        const itemId = item.id;
        const customerId = customer.id;
        return String(itemId) === String(customerId) || itemId === customerId;
      })
      : null;

    const payload = original || customer;

    history.push(`/admin/contacts/customer/${customer.id}`, { client: payload });
  };

  const confirmDelete = async () => {
    try {
      if (!customerToDelete || !customerToDelete.id) {
        onDeleteClose();
        setCustomerToDelete(null);
        return;
      }

      const result = await deleteCustomer(customerToDelete.id);

      if (result.success) {
        onDeleteClose();
        setCustomerToDelete(null);
        refreshMasterData(MASTER_KEYS.CLIENTS).catch(() => {});
        if (propsOnRefresh) propsOnRefresh();
        else getCustomers({});
      }
    } catch (error) {
    }
  };

  const handleCancelEdit = () => {
    onEditClose();
    setEditingCustomer(null);
  };

  return (
    <>
      <Card
        direction="column"
        w="100%"
        px="0px"
        overflowX={{ sm: "scroll", lg: "hidden" }}
      >
        <Flex px="25px" justify="space-between" mb="20px" align="center">
          <Text
            color={textColor}
            fontSize="22px"
            fontWeight="700"
            lineHeight="100%"
          >
            Client Management
          </Text>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="blue"
              size="sm"
              onClick={() => history.push("/admin/customer-registration")}
            >
              Add Client
            </Button>
          </HStack>
        </Flex>

        <Box
          px="25px"
          mb="20px"
          bg={inputBg}
          borderRadius="16px"
          p="24px"
          border="1px"
          borderColor={borderColor}
        >
          <HStack
            spacing={6}
            justify="space-between"
            align="center"
            flexWrap="wrap"
            mb={4}
          >
            <Box flex="1" minW="280px">
              <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                Client Name
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
                  placeholder="Search by client name..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && propsOnSearch?.()}
                  border="2px"
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                  }}
                  pr={searchValue ? "32px" : undefined}
                />
                {searchValue && (
                  <InputRightElement width="32px">
                    <IconButton
                      aria-label="Clear search"
                      size="xs"
                      variant="ghost"
                      icon={<Icon as={MdClose} />}
                      onClick={() => setSearchValue("")}
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
              <HStack spacing={3}>
                {propsOnSearch && (
                  <Button
                    size="md"
                    colorScheme="blue"
                    leftIcon={<Icon as={MdSearch} />}
                    onClick={() => propsOnSearch()}
                    borderRadius="10px"
                    border="2px"
                    borderColor={borderColor}
                  >
                    Search
                  </Button>
                )}
                {(filters.client_code ||
                  filters.email ||
                  filters.country ||
                  searchValue ||
                  sortOrder !== "alphabetical") && (
                  <Button
                    size="md"
                    variant="outline"
                    onClick={clearAllFiltersAndSorting}
                    colorScheme="red"
                    _hover={{ bg: "red.50" }}
                    borderRadius="10px"
                    border="2px"
                  >
                    Clear All
                  </Button>
                )}
              </HStack>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                Advanced Filters
              </Text>
              <Button
                size="md"
                variant={
                  filters.client_code || filters.email || filters.country
                    ? "solid"
                    : "outline"
                }
                colorScheme={
                  filters.client_code || filters.email || filters.country
                    ? "blue"
                    : "gray"
                }
                leftIcon={<Icon as={MdFilterList} />}
                onClick={() => setShowFilterFields(!showFilterFields)}
                borderRadius="10px"
                border="2px"
                borderColor={borderColor}
              >
                {showFilterFields ? "Hide Filters" : "Show Filters"}
              </Button>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                Sort Options
              </Text>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                size="md"
                bg={inputBg}
                color={inputText}
                borderRadius="8px"
                border="2px"
                borderColor={borderColor}
                _focus={{
                  borderColor: "blue.400",
                  boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                }}
                _hover={{
                  borderColor: "blue.300",
                }}
              >
                <option value="alphabetical">A-Z Alphabetical</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </Select>
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
                Filter by Specific Fields
              </Text>

              <HStack spacing={6} flexWrap="wrap" align="flex-start" mb={4}>
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Code
                  </Text>
                  <InputGroup>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                      placeholder="e.g., CPH, ACME123..."
                      value={filters.client_code ?? ""}
                      onChange={(e) => handleFilterChange("client_code", e.target.value)}
                      border="2px"
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{
                        borderColor: "blue.300",
                      }}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      pr={filters.client_code ? "32px" : undefined}
                    />
                    {filters.client_code && (
                      <InputRightElement width="32px">
                        <IconButton
                          aria-label="Clear Code"
                          size="xs"
                          variant="ghost"
                          icon={<Icon as={MdClose} />}
                          onClick={() => handleFilterChange("client_code", "")}
                          _hover={{ bg: "gray.200" }}
                        />
                      </InputRightElement>
                    )}
                  </InputGroup>
                </Box>

                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Email
                  </Text>
                  <InputGroup>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                      placeholder="e.g., example@email.com..."
                      value={filters.email ?? ""}
                      onChange={(e) => handleFilterChange("email", e.target.value)}
                      border="2px"
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{
                        borderColor: "blue.300",
                      }}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      pr={filters.email ? "32px" : undefined}
                    />
                    {filters.email && (
                      <InputRightElement width="32px">
                        <IconButton
                          aria-label="Clear Email"
                          size="xs"
                          variant="ghost"
                          icon={<Icon as={MdClose} />}
                          onClick={() => handleFilterChange("email", "")}
                          _hover={{ bg: "gray.200" }}
                        />
                      </InputRightElement>
                    )}
                  </InputGroup>
                </Box>

                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Country
                  </Text>
                  <HStack spacing={1} align="stretch">
                    <SearchableSelect
                      value={filters.country ?? ""}
                      onChange={(val) => handleFilterChange("country", val)}
                      options={Array.isArray(countries) ? countries : []}
                      placeholder="Select country..."
                      displayKey="name"
                      valueKey="id"
                      formatOption={(opt) => opt?.name ?? String(opt?.id ?? "")}
                      bg={inputBg}
                      color={inputText}
                      borderColor={borderColor}
                      flex={1}
                    />
                    {filters.country && (
                      <IconButton
                        aria-label="Clear Country"
                        size="md"
                        variant="ghost"
                        icon={<Icon as={MdClose} />}
                        onClick={() => handleFilterChange("country", "")}
                        _hover={{ bg: "gray.200" }}
                      />
                    )}
                  </HStack>
                </Box>
              </HStack>

            </Box>
          )}
        </Box>

        <Box
          px="15px"
          overflowX="auto"
          css={{
            "&::-webkit-scrollbar": {
              height: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: useColorModeValue("#f1f1f1", "#2d3748"),
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: useColorModeValue("#c1c1c1", "#4a5568"),
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: useColorModeValue("#a8a8a8", "#718096"),
            },
          }}
        >
          <Table
            {...getTableProps()}
            variant="unstyled"
            size="sm"
            minW="600px"
          >
            <Thead bg={tableHeaderBg}>
              {headerGroups.map((headerGroup, index) => (
                <Tr {...headerGroup.getHeaderGroupProps()} key={index}>
                  {headerGroup.headers.map((column, index) => (
                    <Th
                      {...column.getHeaderProps(column.getSortByToggleProps())}
                      border="1px"
                      borderColor={tableBorderColor}
                      py="12px"
                      px="16px"
                      key={index}
                      fontSize="12px"
                      fontWeight="600"
                      color={tableTextColor}
                      textTransform="uppercase"
                      cursor="pointer"
                      _hover={{ bg: tableHeaderBg }}
                      transition="all 0.2s"
                      minW={column.minWidth || "150px"}
                      w={column.minWidth || "150px"}
                    >
                      <Flex justify="space-between" align="center">
                        {column.render("Header")}
                        <Flex direction="column" align="center" ml={2}>
                          {column.isSorted ? (
                            column.isSortedDesc ? (
                              <Icon
                                as={MdKeyboardArrowDown}
                                color="blue.500"
                                boxSize={4}
                              />
                            ) : (
                              <Icon
                                as={MdKeyboardArrowUp}
                                color="blue.500"
                                boxSize={4}
                              />
                            )
                          ) : (
                            <Icon
                              as={MdUnfoldMore}
                              color={tableTextColorSecondary}
                              boxSize={4}
                            />
                          )}
                        </Flex>
                      </Flex>
                    </Th>
                  ))}
                </Tr>
              ))}
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td
                    colSpan={headerGroups[0]?.headers.length + 1}
                    textAlign="center"
                    py="40px"
                  >
                    <Text color={tableTextColorSecondary} fontSize="sm">
                      Loading clients...
                    </Text>
                  </Td>
                </Tr>
              ) : tableRows.length === 0 ? (
                <Tr>
                  <Td
                    colSpan={headerGroups[0]?.headers.length + 1}
                    textAlign="center"
                    py="40px"
                  >
                    <Text color={tableTextColorSecondary} fontSize="sm">
                      {tableData.length === 0
                        ? "No clients available."
                        : "No clients match your search criteria."}
                    </Text>
                  </Td>
                </Tr>
              ) : (
                tableRows.map((row, index) => {
                  prepareRow(row);
                  return (
                    <Tr
                      {...row.getRowProps()}
                      key={index}
                      bg={index % 2 === 0 ? tableRowBg : tableRowBgAlt}
                      _hover={{ bg: hoverBg }}
                      border="1px"
                      borderColor={tableBorderColor}
                    >
                      {row.cells.map((cell, index) => {
                        const value = cell.value;
                        let data = (
                          <Text color={textColor} fontSize="sm">
                            {value || "-"}
                          </Text>
                        );

                        if (cell.column.Header === "CLIENT CODE") {
                          data = (
                            <Text color={textColor} fontSize="sm" fontWeight="600">
                              {value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "CLIENT NAME") {
                          data = (
                            <Text color={textColor} fontSize="sm" fontWeight="500">
                              {value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "CLIENT TYPE") {
                          data = (
                            <Text color={textColor} fontSize="sm" textTransform="capitalize">
                              {value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "COMPANY TYPE") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "EMAIL") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "CLIENT PEOPLE") {
                          const rawCount = Number(row.original.children_count ?? 0);
                          const childrenCount = Number.isNaN(rawCount) ? 0 : rawCount;
                          const hasPeople = childrenCount > 0;

                          const peopleList = Array.isArray(row.original.children_display)
                            ? row.original.children_display
                            : [];

                          const tooltipContent = hasPeople
                            ? peopleList
                                .slice(0, 5)
                                .map((person) => {
                                  const pieces = [
                                    person.name,
                                    person.jobTitle || person.job_title,
                                    person.email || person.phone,
                                  ].filter(Boolean);
                                  return pieces.join(" · ");
                                })
                                .join("\n") +
                              (peopleList.length > 5
                                ? `\n+${peopleList.length - 5} more`
                                : "")
                            : "";

                          data = (
                            <Tooltip
                              label={tooltipContent}
                              placement="top"
                              hasArrow
                              isDisabled={!hasPeople}
                              maxW="260px"
                              whiteSpace="pre-wrap"
                              openDelay={150}
                            >
                              <HStack spacing={2} align="center">
                                <Icon
                                  as={MdPeople}
                                  color={childrenCount > 0 ? "blue.500" : "gray.400"}
                                  boxSize={4}
                                />
                                <Box
                                  as="span"
                                  px={2}
                                  py={1}
                                  borderRadius="md"
                                  bg={childrenCount > 0 ? "blue.50" : "gray.100"}
                                  color={childrenCount > 0 ? "blue.700" : "gray.600"}
                                  fontWeight="600"
                                  fontSize="sm"
                                  minW="32px"
                                  textAlign="center"
                                  display="inline-block"
                                >
                                  {childrenCount}
                                </Box>
                              </HStack>
                            </Tooltip>
                          );
                        } else if (cell.column.Header === "ACTIONS") {
                          data = (
                            <HStack spacing={1}>
                              <Tooltip label="View Client">
                                <IconButton
                                  icon={<Icon as={MdVisibility} />}
                                  size="sm"
                                  colorScheme="teal"
                                  variant="ghost"
                                  onClick={() => handleView(row.original)}
                                  aria-label="View client"
                                />
                              </Tooltip>
                              <Tooltip label="Edit Client">
                                <IconButton
                                  icon={<Icon as={MdEdit} />}
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => handleEdit(row.original)}
                                  aria-label="Edit client"
                                />
                              </Tooltip>
                          {isAdmin && (
                              <Tooltip label="Delete Client">
                                <IconButton
                                  icon={<Icon as={MdDelete} />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => handleDelete(row.original)}
                                  aria-label="Delete client"
                                />
                              </Tooltip>
                          )}
                            </HStack>
                          );
                        }

                        return (
                          <Td
                            {...cell.getCellProps()}
                            key={index}
                            borderRight="1px"
                            borderColor={tableBorderColor}
                            py="12px"
                            px="16px"
                            minW={cell.column.minWidth || "150px"}
                            w={cell.column.minWidth || "150px"}
                          >
                            {data}
                          </Td>
                        );
                      })}
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Box>

        <Flex px="25px" justify="space-between" align="center" py="20px" flexWrap="wrap" gap={4}>
          <Text fontSize="sm" color={tableTextColorSecondary}>
            Showing {paginationData.total_count === 0 ? 0 : ((paginationData.page - 1) * paginationData.page_size + 1)} to {Math.min(paginationData.page * paginationData.page_size, paginationData.total_count)} of {paginationData.total_count} results
          </Text>

          <HStack spacing={4} align="center" flexWrap="wrap">
            <HStack spacing={2} align="center">
            <HStack spacing={1}>
              <Button
                size="sm"
                onClick={() => onPageChange && onPageChange(1)}
                isDisabled={!paginationData.has_previous}
                variant="outline"
                aria-label="First page"
              >
                ««
              </Button>

              <Button
                size="sm"
                onClick={() => onPageChange && onPageChange(paginationData.page - 1)}
                isDisabled={!paginationData.has_previous}
                variant="outline"
                aria-label="Previous page"
              >
                «
              </Button>

              {(() => {
                const pageNumbers = [];
                const totalPages = paginationData.total_pages || 1;
                const currentPage = paginationData.page || 1;
                const maxVisiblePages = 5;

                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                if (endPage - startPage < maxVisiblePages - 1) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                  pageNumbers.push(
                    <Button
                      key={i}
                      size="sm"
                      onClick={() => onPageChange && onPageChange(i)}
                      variant={i === currentPage ? "solid" : "outline"}
                      colorScheme={i === currentPage ? "blue" : "gray"}
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
                onClick={() => onPageChange && onPageChange(paginationData.page + 1)}
                isDisabled={!paginationData.has_next}
                variant="outline"
                aria-label="Next page"
              >
                »
              </Button>

              <Button
                size="sm"
                onClick={() => onPageChange && onPageChange(paginationData.total_pages)}
                isDisabled={!paginationData.has_next}
                variant="outline"
                aria-label="Last page"
              >
                »»
              </Button>
            </HStack>

            <Text fontSize="sm" color={tableTextColorSecondary}>
              Page {paginationData.page} of {paginationData.total_pages}
            </Text>
            </HStack>
          </HStack>
        </Flex>
      </Card>

      <Modal isOpen={isEditOpen} onClose={handleCancelEdit} size="6xl">
        <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
        <ModalContent bg={modalBg} border="1px" borderColor={modalBorder} maxH="90vh" overflowY="auto">
          <ModalHeader
            bg={modalHeaderBg}
            borderBottom="1px"
            borderColor={modalBorder}
          >
            Edit Client
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={6}>
              <Box w="100%">
                <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                  Basic Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <FormControl isRequired>
                    <FormLabel>Client Name</FormLabel>
                    <Input
                      placeholder="e.g., ACME Shipping Co."
                      value={editingCustomer?.name || ""}
                      onChange={(e) => handleEditInputChange("name", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Client ID</FormLabel>
                    <Input
                      placeholder="e.g., ACME123"
                      value={editingCustomer?.client_code || ""}
                      onChange={(e) => handleEditInputChange("client_code", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Client Category</FormLabel>
                    <Select
                      placeholder="Select category..."
                      value={editingCustomer?.client_category || ""}
                      onChange={(e) => handleEditInputChange("client_category", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    >
                      <option value="shipspares">Ship Spares</option>
                      <option value="bunker">Bunker</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Registration Number</FormLabel>
                    <Input
                      placeholder="e.g., SG12345678"
                      value={editingCustomer?.reg_no || ""}
                      onChange={(e) => handleEditInputChange("reg_no", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>
                </Grid>
              </Box>

              <Box w="100%">
                <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                  Address Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <FormControl>
                    <FormLabel>Street Address 1</FormLabel>
                    <Input
                      placeholder="e.g., 119 Airport Cargo Road"
                      value={editingCustomer?.street || ""}
                      onChange={(e) => handleEditInputChange("street", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Street Address 2</FormLabel>
                    <Input
                      placeholder="e.g., #01-03/04 Changi Cargo Megaplex"
                      value={editingCustomer?.street2 || ""}
                      onChange={(e) => handleEditInputChange("street2", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>City</FormLabel>
                    <Input
                      placeholder="e.g., Singapore"
                      value={editingCustomer?.city || ""}
                      onChange={(e) => handleEditInputChange("city", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Postal Code</FormLabel>
                    <Input
                      placeholder="e.g., 819454"
                      value={editingCustomer?.zip || ""}
                      onChange={(e) => handleEditInputChange("zip", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Country</FormLabel>
                    <SearchableSelect
                      placeholder="Select country..."
                      value={editingCustomer?.country_id || ""}
                      onChange={(val) => handleEditInputChange("country_id", val)}
                      options={Array.isArray(countries) ? countries : []}
                      displayKey="name"
                      valueKey="id"
                      formatOption={(opt) => opt?.name ?? String(opt?.id ?? "")}
                      isLoading={false}
                      bg={inputBg}
                      color={inputText}
                      borderColor={borderColor}
                    />
                  </FormControl>
                </Grid>
              </Box>

              <Box w="100%">
                <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                  Contact Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <FormControl>
                    <FormLabel>Primary Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="e.g., contact@acme.com"
                      value={editingCustomer?.email || ""}
                      onChange={(e) => handleEditInputChange("email", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Secondary Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="e.g., backup@acme.com"
                      value={editingCustomer?.email2 || ""}
                      onChange={(e) => handleEditInputChange("email2", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Primary Phone</FormLabel>
                    <Input
                      placeholder="e.g., +65 1234 5678"
                      value={editingCustomer?.phone || ""}
                      onChange={(e) => handleEditInputChange("phone", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Secondary Phone</FormLabel>
                    <Input
                      placeholder="e.g., +65 9876 5432"
                      value={editingCustomer?.phone2 || ""}
                      onChange={(e) => handleEditInputChange("phone2", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Website</FormLabel>
                    <Input
                      placeholder="e.g., http://acme.com"
                      value={editingCustomer?.website || ""}
                      onChange={(e) => handleEditInputChange("website", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Tariffs</FormLabel>
                    <Input
                      placeholder="Tariffs"
                      value={editingCustomer?.tariffs || ""}
                      onChange={(e) => handleEditInputChange("tariffs", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Client Invoicing</FormLabel>
                    <Textarea
                      placeholder="Type and press Enter to create numbered list..."
                      value={editingCustomer?.client_invoicing || ""}
                      onChange={(e) => handleEditInputChange("client_invoicing", e.target.value)}
                      onKeyDown={createNumberedListHandler("client_invoicing")}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      rows={3}
                      resize="vertical"
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>
                </Grid>
              </Box>

              <Box w="100%">
                <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                  Additional Information
                </Text>
                  <FormControl>
                    <FormLabel>Remarks</FormLabel>
                    <Textarea
                      placeholder="Type and press Enter to create numbered list..."
                      value={editingCustomer?.remarks || ""}
                      onChange={(e) => handleEditInputChange("remarks", e.target.value)}
                      onKeyDown={createNumberedListHandler("remarks")}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      rows={3}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveEdit}
              isDisabled={!editingCustomer?.name || !editingCustomer?.client_code || !editingCustomer?.client_category || updateLoading}
              isLoading={updateLoading}
            >
              Update Client
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Client Updated Successfully!"
        message={successMessage}
      />

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay bg="rgba(0, 0, 0, 0.6)">
          <AlertDialogContent
            bg={modalBg}
            border="1px"
            borderColor={modalBorder}
          >
            <AlertDialogHeader
              fontSize="lg"
              fontWeight="bold"
              bg={modalHeaderBg}
              borderBottom="1px"
              borderColor={modalBorder}
            >
              Delete Client
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{customerToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={deleteLoading}
                isDisabled={deleteLoading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

    </>
  );
}
