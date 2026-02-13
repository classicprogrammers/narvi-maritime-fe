import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Input,
  Box,
  List,
  ListItem,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';

const SimpleSearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  displayKey = "name",
  valueKey = "id",
  formatOption = (option) => option[displayKey] || option.name || `Option ${option[valueKey]}`,
  isLoading = false,
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
  const [filteredOptions, setFilteredOptions] = useState(options);
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
  const { w, minW, maxW, ...inputProps } = props;

  // Filter options based on search
  useEffect(() => {
    if (searchValue.trim()) {
      const filtered = options.filter(option => {
        const optionText = formatOption(option).toLowerCase();
        return optionText.includes(searchValue.toLowerCase());
      });
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchValue, options, formatOption]);

  // When dropdown opens or filtered options change, set highlighted index
  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex(opt => String(opt[valueKey]) === String(value));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, valueKey, filteredOptions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedItemRef.current) {
      highlightedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    // Initialize searchValue with current display value to preserve it
    setSearchValue(displayValue);
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
  }, [isOpen]);

  const dropdownContent = isOpen ? (
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
      ) : filteredOptions.length > 0 ? (
        <List spacing={0}>
          {filteredOptions.map((option, index) => (
            <ListItem
              key={option.id ?? `opt-${index}`}
              ref={index === highlightedIndex ? highlightedItemRef : null}
              px={3}
              py={2}
              cursor="pointer"
              bg={index === highlightedIndex ? highlightBg : undefined}
              _hover={{ bg: highlightBg }}
              onClick={(e) => handleSelect(e, option)}
              onMouseDown={(e) => e.preventDefault()}
              borderBottom="1px"
              borderColor={defaultBorderColor}
              fontSize="sm"
            >
              {formatOption(option)}
            </ListItem>
          ))}
        </List>
      ) : (
        <Box px={3} py={2} color="gray.500" fontSize="sm">
          No options found
        </Box>
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

