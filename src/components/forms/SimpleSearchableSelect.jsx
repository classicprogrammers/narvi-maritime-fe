import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Input,
  Box,
  Flex,
  IconButton,
  List,
  ListItem,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';

const SimpleSearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  onSearchChange,
  prefillOnFocus = true,
  clearOnEmptySearch = true,
  serverSideSearch = false,
  displayKey = "name",
  valueKey = "id",
  formatOption = (option) => option[displayKey] || option.name || `Option ${option[valueKey]}`,
  isLoading = false,
  canDeleteOption,
  onDeleteOption,
  isDeletingOptionId = null,
  bg,
  color,
  borderColor,
  size = "sm",
  // When enabled, the input auto-sizes to its content (selected label / search text)
  autoWidth = false,
  autoWidthMin = 12,
  autoWidthMax = 60,
  autoWidthPadding = 2,
  ...props
}) => {
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
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const highlightBg = useColorModeValue("blue.50", "blue.900");

  // Find selected option to display
  const selectedOption = options.find(option => String(option[valueKey]) === String(value));
  const displayValue = selectedOption ? formatOption(selectedOption) : "";

  // Value shown inside the input
  const inputValue = isOpen ? searchValue : displayValue;

  // Compute htmlSize when autoWidth enabled (Input supports htmlSize)
  const computedHtmlSize = (() => {
    if (!autoWidth) return undefined;
    const valueLen = String(inputValue ?? "").length;
    const placeholderLen = String(placeholder ?? "").length;
    const desired = Math.max(valueLen, placeholderLen) + Number(autoWidthPadding || 0);
    const min = Number(autoWidthMin || 0);
    const max = Number(autoWidthMax || 0);
    if (max > 0) return Math.min(max, Math.max(min, desired));
    return Math.max(min, desired);
  })();

  // Pull layout props so we can apply them to the wrapper too
  const { w, minW, maxW, onFocus: onFocusProp, ...inputProps } = props;

  const filteredOptions = useMemo(() => {
    if (serverSideSearch || !isOpen) return options;
    const q = String(searchValue).trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => formatOption(option).toLowerCase().includes(q));
  // Exclude formatOption from deps to avoid recomputes on every parent render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, options, isOpen, serverSideSearch]);

  // Reset search text when closed or when a new value is selected externally
  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
    }
  }, [value, isOpen]);

  // When dropdown opens/value changes, set highlighted index
  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex(opt => String(opt[valueKey]) === String(value));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  // Intentionally exclude filteredOptions to avoid resetting highlighted item
  // while navigating with keyboard after typing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, value, valueKey]);

  // Scroll highlighted item into view inside the dropdown only (avoid scrolling the page)
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
      container.scrollTo({ top: itemTop, behavior: 'smooth' });
    } else if (itemTop + itemHeight > scrollTop + containerHeight) {
      container.scrollTo({ top: itemTop + itemHeight - containerHeight, behavior: 'smooth' });
    }
  }, [highlightedIndex, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideContainer = containerRef.current && containerRef.current.contains(event.target);
      const isClickInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);

      if (!isClickInsideContainer && !isClickInsideDropdown) {
        setIsOpen(false);
        setSearchValue("");
      }
    };

    if (isOpen) {
      // Use a slight delay to ensure the click on dropdown item is processed first
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (e, option) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(option[valueKey]);
    setIsOpen(false);
    setSearchValue("");
  };

  const openDropdown = (prefill = "") => {
    setIsOpen(true);
    setSearchValue(prefill);
    if (typeof onSearchChange === "function") onSearchChange(prefill);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    setIsOpen(true);
    if (clearOnEmptySearch && newValue === "" && value != null && value !== "") {
      onChange("");
    }
    if (typeof onSearchChange === "function") onSearchChange(newValue);
  };

  const handleFocus = (e) => {
    onFocusProp?.(e);
    openDropdown(prefillOnFocus && value ? displayValue : "");
  };

  const handleClick = () => {
    if (!isOpen) {
      openDropdown(prefillOnFocus && value ? displayValue : "");
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    const n = filteredOptions.length;
    if (n === 0) {
      if (e.key === 'Escape' || e.key === 'Tab') {
        setIsOpen(false);
        setSearchValue("");
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < n - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : n - 1));
        break;
      case 'Enter':
        e.preventDefault();
        handleSelect(e, filteredOptions[highlightedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchValue("");
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchValue("");
        break;
      default:
        break;
    }
  };

  // Calculate dropdown position when open
  useEffect(() => {
    if (!isOpen || !containerRef.current || !dropdownRef.current) return;

    const updatePosition = () => {
      if (containerRef.current && dropdownRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dropdown = dropdownRef.current;
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.width = `${rect.width}px`;
        dropdown.style.zIndex = '9999';
      }
    };

    updatePosition();

    // Update position on scroll and resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, filteredOptions.length, isLoading]);

  const showDropdown = isOpen && (isLoading || filteredOptions.length > 0);
  const dropdownContent = showDropdown ? (
    <Box
      ref={dropdownRef}
      bg={dropdownBg}
      border="1px"
      borderColor={defaultBorderColor}
      borderRadius="md"
      boxShadow="lg"
      maxH="200px"
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
              key={option.id ?? option.key ?? `opt-${index}`}
              ref={index === highlightedIndex ? highlightedItemRef : null}
              px={canDeleteOption?.(option) ? 2 : 3}
              py={canDeleteOption?.(option) ? 1 : 2}
              bg={index === highlightedIndex ? highlightBg : undefined}
              borderBottom="1px"
              borderColor={defaultBorderColor}
              fontSize="sm"
            >
              <Flex align="center" gap={1}>
                <Box
                  flex="1"
                  px={canDeleteOption?.(option) ? 1 : 0}
                  py={canDeleteOption?.(option) ? 1 : 0}
                  cursor="pointer"
                  _hover={{ bg: highlightBg }}
                  onClick={(e) => handleSelect(e, option)}
                  onMouseDown={(e) => e.preventDefault()}
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
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteOption?.(option, e);
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
      <Box
        position="relative"
        ref={containerRef}
        w={autoWidth ? (w || "auto") : (w || "100%")}
        minW={minW}
        maxW={maxW}
      >
        <Input
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
          title={displayValue}
          w={autoWidth ? "auto" : w}
          minW={minW}
          maxW={maxW}
          htmlSize={inputProps.htmlSize ?? computedHtmlSize}
          _focus={{
            borderColor: "#1c4a95",
            boxShadow: "0 0 0 1px #1c4a95",
          }}
          {...inputProps}
        />
      </Box>
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
};

export default SimpleSearchableSelect;

