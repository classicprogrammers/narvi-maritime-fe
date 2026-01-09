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
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  const defaultBg = useColorModeValue("gray.100", "gray.800");
  const defaultColor = useColorModeValue("gray.700", "gray.100");
  const defaultBorderColor = useColorModeValue("gray.200", "gray.700");
  const dropdownBg = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.100", "gray.700");

  // Find selected option to display
  const selectedOption = options.find(option => String(option[valueKey]) === String(value));
  const displayValue = selectedOption ? formatOption(selectedOption) : "";

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
          {filteredOptions.map((option) => (
            <ListItem
              key={option[valueKey]}
              px={3}
              py={2}
              cursor="pointer"
              _hover={{ bg: hoverBg }}
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
      <Box position="relative" ref={containerRef} w="100%">
        <Input
          value={isOpen ? searchValue : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          size={size}
          bg={bg || defaultBg}
          color={color || defaultColor}
          borderColor={borderColor || defaultBorderColor}
          _focus={{
            borderColor: "#1c4a95",
            boxShadow: "0 0 0 1px #1c4a95",
          }}
          {...props}
        />
      </Box>
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
};

export default SimpleSearchableSelect;

