import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Spinner,
  useColorModeValue,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { getTextOptionIdByValue } from "../../utils/m2oFieldOptions";

/**
 * Free-text combobox with searchable options and optional per-row delete.
 */
export default function DeletableOptionCombobox({
  value = "",
  onChange,
  options = [],
  onSearchChange,
  placeholder = "Select or type...",
  formatOption = (option) => option.name || "",
  isLoading = false,
  isClearable = true,
  canDeleteOption,
  onDeleteOption,
  isDeletingOptionId = null,
  bg,
  color,
  borderColor,
  size = "sm",
  id: inputId,
  list: _ignoredList,
  autoComplete: _ignoredAutoComplete,
  ...props
}) {
  const fieldName = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const highlightedItemRef = useRef(null);

  const defaultBg = useColorModeValue("gray.100", "gray.800");
  const defaultColor = useColorModeValue("gray.700", "gray.100");
  const defaultBorderColor = useColorModeValue("gray.200", "gray.700");
  const dropdownBg = useColorModeValue("white", "gray.800");
  const highlightBg = useColorModeValue("blue.50", "blue.900");

  const inputValue = isOpen ? searchValue : value || "";

  const filteredOptions = useMemo(() => {
    const q = String(isOpen ? searchValue : value || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => formatOption(option).toLowerCase().includes(q));
  }, [formatOption, isOpen, options, searchValue, value]);

  useEffect(() => {
    if (!isOpen) return;
    const idx = filteredOptions.findIndex(
      (option) => formatOption(option).toLowerCase() === String(value || "").toLowerCase()
    );
    setHighlightedIndex(idx >= 0 ? idx : 0);
  }, [filteredOptions, formatOption, isOpen, value]);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current || !highlightedItemRef.current) return;
    const container = dropdownRef.current;
    const item = highlightedItemRef.current;
    const cRect = container.getBoundingClientRect();
    const iRect = item.getBoundingClientRect();
    const itemTop = iRect.top - cRect.top + container.scrollTop;
    const itemHeight = item.offsetHeight;
    const containerHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    if (itemTop < scrollTop) {
      container.scrollTo({ top: itemTop, behavior: "smooth" });
    } else if (itemTop + itemHeight > scrollTop + containerHeight) {
      container.scrollTo({ top: itemTop + itemHeight - containerHeight, behavior: "smooth" });
    }
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideContainer = containerRef.current?.contains(event.target);
      const insideDropdown = dropdownRef.current?.contains(event.target);
      if (!insideContainer && !insideDropdown) {
        setIsOpen(false);
        setSearchValue("");
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
      dropdown.style.width = `${Math.max(rect.width, 220)}px`;
      dropdown.style.zIndex = "9999";
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, filteredOptions.length, isLoading]);

  const selectOption = (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    const nextValue = formatOption(option);
    onChange?.(nextValue, option);
    onSearchChange?.(nextValue);
    setIsOpen(false);
    setSearchValue("");
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setSearchValue(nextValue);
    setIsOpen(true);
    onChange?.(nextValue, { id: getTextOptionIdByValue(options, nextValue), name: nextValue });
    onSearchChange?.(nextValue);
  };

  const openDropdown = (prefill = value || "") => {
    const nextSearch = prefill ?? "";
    setIsOpen(true);
    setSearchValue(nextSearch);
    onSearchChange?.(nextSearch);
  };

  const handleFocus = () => {
    openDropdown(value || "");
  };

  const handleClick = () => {
    if (!isOpen) {
      openDropdown(value || "");
    }
  };

  const handleKeyDown = (event) => {
    if (!isOpen) return;
    const count = filteredOptions.length;
    if (count === 0) {
      if (event.key === "Escape" || event.key === "Tab") {
        setIsOpen(false);
        setSearchValue("");
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
        break;
      case "Enter":
        event.preventDefault();
        selectOption(event, filteredOptions[highlightedIndex]);
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        setSearchValue("");
        break;
      case "Tab":
        setIsOpen(false);
        setSearchValue("");
        break;
      default:
        break;
    }
  };

  const showDropdown = isOpen && (isLoading || filteredOptions.length > 0);
  const hasClearableContent = String(inputValue ?? "").trim().length > 0;

  const handleClear = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSearchValue("");
    onChange?.("", null);
    onSearchChange?.("");
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const dropdownContent = showDropdown ? (
    <Box
      ref={dropdownRef}
      bg={dropdownBg}
      border="1px"
      borderColor={defaultBorderColor}
      borderRadius="md"
      boxShadow="lg"
      maxH="220px"
      overflowY="auto"
      zIndex={9999}
    >
      {isLoading ? (
        <Box p={3} textAlign="center">
          <Spinner size="sm" />
        </Box>
      ) : (
        <List spacing={0}>
          {filteredOptions.map((option, index) => (
            <ListItem
              key={option.key || `${option.id ?? "txt"}-${formatOption(option)}`}
              ref={index === highlightedIndex ? highlightedItemRef : null}
              px={2}
              py={1}
              borderBottom="1px"
              borderColor={defaultBorderColor}
              bg={index === highlightedIndex ? highlightBg : undefined}
            >
              <Flex align="center" gap={1}>
                <Box
                  flex="1"
                  px={1}
                  py={1}
                  cursor="pointer"
                  fontSize="sm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => selectOption(event, option)}
                >
                  {formatOption(option)}
                </Box>
                {canDeleteOption?.(option) ? (
                  <IconButton
                    aria-label={`Delete ${formatOption(option)}`}
                    icon={<CloseIcon boxSize={2.5} />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    isLoading={Number(isDeletingOptionId) === Number(option.id)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDeleteOption?.(option, event);
                    }}
                  />
                ) : null}
              </Flex>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  ) : null;

  return (
    <>
      <Box position="relative" ref={containerRef} w={props.w || "100%"}>
        <InputGroup size={size} w={props.w || "100%"}>
          <Input
            id={inputId}
            name={fieldName}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            size={size}
            bg={bg || defaultBg}
            color={color || defaultColor}
            borderColor={borderColor || defaultBorderColor}
            pr={isClearable && hasClearableContent ? "2rem" : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            {...props}
          />
          {isClearable && hasClearableContent ? (
            <InputRightElement width="2rem" h="100%">
              <IconButton
                aria-label="Clear selection"
                icon={<CloseIcon boxSize={2.5} />}
                size="xs"
                variant="ghost"
                colorScheme="gray"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleClear}
              />
            </InputRightElement>
          ) : null}
        </InputGroup>
      </Box>
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </>
  );
}
