import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Spinner,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { MdAdd, MdEdit } from "react-icons/md";

const normalizeId = (value) => {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

/**
 * Searchable dropdown for master options (shipped by / from / to).
 * - Rename existing rows: POST /api/form/options/update (pencil icon in list).
 * - Add new: SI form save API immediately (Add row / search confirm for new text).
 * - Link existing selection: SI form save API (auto-saved on list item click).
 */
export default function MasterOptionPicker({
  id: inputId,
  savedName = "",
  savedId = null,
  pendingSelection = null,
  onPendingChange,
  onConfirm,
  onAddNew,
  isConfirming = false,
  options = [],
  onSearchChange,
  isLoading = false,
  placeholder = "Select...",
  canDeleteOption,
  onDeleteOption,
  isDeletingOptionId = null,
  canUpdateOption,
  onUpdateOption,
  isUpdatingOptionId = null,
  onOptionsRefresh,
  color = "white",
  bg = "transparent",
  borderColor = "transparent",
  size = "sm",
  ...inputProps
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const dropdownBg = useColorModeValue("white", "gray.800");
  const dropdownBorder = useColorModeValue("gray.200", "gray.600");
  const highlightBg = useColorModeValue("blue.50", "blue.900");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const addRowBg = useColorModeValue("green.50", "green.900");
  const addRowColor = useColorModeValue("green.700", "green.200");

  const activeName = pendingSelection != null
    ? String(pendingSelection.name ?? "").trim()
    : String(savedName ?? "").trim();
  const activeId = pendingSelection != null
    ? normalizeId(pendingSelection.id)
    : normalizeId(savedId);
  const isDirty = pendingSelection != null && (
    String(pendingSelection.name ?? "").trim() !== String(savedName ?? "").trim()
    || normalizeId(pendingSelection.id) !== normalizeId(savedId)
  );
  const showClear = Boolean(activeName) || isDirty;
  const rightIconsWidth = showClear ? "2rem" : undefined;

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) =>
      String(option.name || "").toLowerCase().includes(q)
    );
  }, [options, search]);

  const addNewLabel = search.trim();
  const showAddRow = addNewLabel.length > 0
    && !options.some((opt) => String(opt.name || "").toLowerCase() === addNewLabel.toLowerCase());

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setEditingId(null);
      setEditName("");
      onSearchChange?.("");
      return undefined;
    }

    const focusSearch = () => {
      searchInputRef.current?.focus({ preventScroll: true });
    };
    const rafId = requestAnimationFrame(focusSearch);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, onSearchChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideContainer = containerRef.current?.contains(event.target);
      const insideDropdown = dropdownRef.current?.contains(event.target);
      if (!insideContainer && !insideDropdown) {
        setIsOpen(false);
      }
    };

    if (!isOpen) return undefined;
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !containerRef.current || !dropdownRef.current) return undefined;

    const updatePosition = () => {
      if (!containerRef.current || !dropdownRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      dropdown.style.position = "fixed";
      dropdown.style.top = `${rect.bottom + 4}px`;
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.width = `${Math.max(rect.width, 240)}px`;
      dropdown.style.zIndex = "9999";
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, filteredOptions.length, showAddRow, isLoading]);

  const openDropdown = (event) => {
    event?.preventDefault?.();
    setIsOpen(true);
  };

  const selectOption = async (option) => {
    const selection = {
      name: String(option.name || ""),
      id: normalizeId(option.id),
    };
    onPendingChange?.(selection);
    setIsOpen(false);
    setSearch("");
    if (onConfirm) {
      await onConfirm(selection);
    }
  };

  const selectNewOption = () => {
    const trimmed = addNewLabel.trim();
    if (!trimmed) return;
    onPendingChange?.({ name: trimmed, id: null });
    setIsOpen(false);
  };

  const addNewOption = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const trimmed = addNewLabel.trim();
    if (!trimmed || isConfirming) return;

    if (onAddNew) {
      await onAddNew(trimmed);
      setIsOpen(false);
      setSearch("");
      return;
    }

    selectNewOption();
  };

  const startEdit = (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingId(normalizeId(option.id));
    setEditName(String(option.name || ""));
  };

  const cancelEdit = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setEditingId(null);
    setEditName("");
  };

  const confirmEdit = async (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    const trimmed = editName.trim();
    if (!trimmed || !canUpdateOption?.(option)) return;
    const result = await onUpdateOption?.(option, trimmed);
    if (!result) return;
    if (activeId === normalizeId(option.id)) {
      onPendingChange?.({ name: trimmed, id: normalizeId(option.id) });
    }
    await onOptionsRefresh?.();
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = async (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    const deleted = await onDeleteOption?.(option, event);
    if (!deleted) return;
    if (activeId === normalizeId(option.id)) {
      onPendingChange?.({ name: "", id: null });
    }
    await onOptionsRefresh?.();
  };

  const handleClear = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isDirty) {
      onPendingChange?.(null);
      return;
    }
    if (activeName) {
      const cleared = { name: "", id: null };
      onPendingChange?.(cleared);
      if (onConfirm) {
        await onConfirm(cleared);
      }
    }
  };

  const handleSearchConfirm = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const trimmed = search.trim();
    if (!trimmed) return;

    const exactMatch = options.find(
      (opt) => String(opt.name || "").toLowerCase() === trimmed.toLowerCase()
    );
    if (exactMatch) {
      selectOption(exactMatch);
      return;
    }
    if (filteredOptions.length === 1) {
      selectOption(filteredOptions[0]);
      return;
    }
    if (showAddRow) {
      if (onAddNew) {
        await addNewOption(event);
        return;
      }
      selectNewOption();
    }
  };

  const handleSearchClear = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setSearch("");
    onSearchChange?.("");
  };

  const dropdownContent = isOpen ? (
    <Box
      ref={dropdownRef}
      bg={dropdownBg}
      border="1px"
      borderColor={dropdownBorder}
      borderRadius="md"
      boxShadow="lg"
      overflow="hidden"
      zIndex={9999}
    >
      <Box p={2} borderBottom="1px" borderColor={dropdownBorder}>
        <InputGroup size="sm">
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(event) => {
              const next = event.target.value;
              setSearch(next);
              onSearchChange?.(next);
            }}
            placeholder="Search..."
            pr={search.trim() ? "4rem" : undefined}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsOpen(false);
              if (event.key === "Enter") handleSearchConfirm(event);
            }}
          />
          {search.trim() ? (
            <InputRightElement width="4rem" h="100%">
              <HStack spacing={0} justify="flex-end" w="100%" pr={1}>
                <IconButton
                  aria-label="Confirm search"
                  icon={<CheckIcon boxSize={2.5} />}
                  size="xs"
                  colorScheme="green"
                  variant="ghost"
                  isLoading={isConfirming}
                  isDisabled={isConfirming}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleSearchConfirm}
                />
                <IconButton
                  aria-label="Clear search"
                  icon={<CloseIcon boxSize={2.5} />}
                  size="xs"
                  variant="ghost"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleSearchClear}
                />
              </HStack>
            </InputRightElement>
          ) : null}
        </InputGroup>
      </Box>

      <Box maxH="220px" overflowY="auto">
        {isLoading ? (
          <Flex p={4} justify="center">
            <Spinner size="sm" />
          </Flex>
        ) : (
          <List spacing={0}>
            {filteredOptions.length === 0 && !showAddRow ? (
              <ListItem px={3} py={2} fontSize="sm" color={mutedColor}>
                No options found
              </ListItem>
            ) : null}
            {filteredOptions.map((option) => {
              const optionId = normalizeId(option.id);
              const isActive = optionId === activeId
                && String(option.name || "").toLowerCase() === activeName.toLowerCase();
              const isEditing = editingId === optionId;

              return (
                <ListItem
                  key={option.key || `${option.id ?? "txt"}-${option.name}`}
                  px={2}
                  py={1}
                  borderBottom="1px"
                  borderColor={dropdownBorder}
                  bg={isActive ? highlightBg : undefined}
                >
                  {isEditing ? (
                    <HStack spacing={1}>
                      <Input
                        size="sm"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") confirmEdit(event, option);
                          if (event.key === "Escape") cancelEdit(event);
                        }}
                        flex="1"
                      />
                      <IconButton
                        aria-label="Save option name"
                        icon={<CheckIcon boxSize={2.5} />}
                        size="xs"
                        colorScheme="green"
                        variant="ghost"
                        isLoading={Number(isUpdatingOptionId) === Number(option.id)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => confirmEdit(event, option)}
                      />
                      <IconButton
                        aria-label="Cancel edit"
                        icon={<CloseIcon boxSize={2.5} />}
                        size="xs"
                        variant="ghost"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={cancelEdit}
                      />
                    </HStack>
                  ) : (
                    <Flex align="center" gap={1}>
                      <Box
                        flex="1"
                        px={1}
                        py={1}
                        cursor="pointer"
                        fontSize="sm"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectOption(option)}
                      >
                        {option.name}
                      </Box>
                      {canUpdateOption?.(option) ? (
                        <IconButton
                          aria-label={`Edit ${option.name}`}
                          icon={<Icon as={MdEdit} boxSize={3.5} />}
                          size="xs"
                          variant="ghost"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => startEdit(event, option)}
                        />
                      ) : null}
                      {canDeleteOption?.(option) ? (
                        <IconButton
                          aria-label={`Delete ${option.name}`}
                          icon={<CloseIcon boxSize={2.5} />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          isLoading={Number(isDeletingOptionId) === Number(option.id)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => handleDelete(event, option)}
                        />
                      ) : null}
                    </Flex>
                  )}
                </ListItem>
              );
            })}
            {showAddRow ? (
              <ListItem
                px={2}
                py={2}
                bg={addRowBg}
                borderTop={filteredOptions.length > 0 ? "1px" : undefined}
                borderColor={dropdownBorder}
                cursor={isConfirming ? "not-allowed" : "pointer"}
                opacity={isConfirming ? 0.7 : 1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={addNewOption}
              >
                <HStack spacing={2} fontSize="sm" fontWeight="600" color={addRowColor}>
                  {isConfirming ? <Spinner size="xs" /> : <Icon as={MdAdd} />}
                  <Text>Add &quot;{addNewLabel}&quot;</Text>
                </HStack>
              </ListItem>
            ) : null}
          </List>
        )}
      </Box>
    </Box>
  ) : null;

  return (
    <>
      <Box ref={containerRef} position="relative" w="100%">
        <InputGroup size={size} w="100%">
          <Input
            id={inputId}
            readOnly
            value={activeName}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              openDropdown(event);
            }}
            placeholder={placeholder}
            size={size}
            bg={bg}
            color={color}
            borderColor={isDirty ? "yellow.300" : borderColor}
            fontWeight="medium"
            variant="unstyled"
            cursor="pointer"
            pr={rightIconsWidth}
            _placeholder={{ color: "whiteAlpha.800" }}
            {...inputProps}
          />
          {showClear ? (
            <InputRightElement width={rightIconsWidth} h="100%">
              <HStack spacing={0} justify="flex-end" w="100%" pr={1}>
                <IconButton
                  aria-label="Clear selection"
                  icon={<CloseIcon boxSize={2.5} />}
                  size="xs"
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleClear}
                />
              </HStack>
            </InputRightElement>
          ) : null}
        </InputGroup>
      </Box>
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </>
  );
}
