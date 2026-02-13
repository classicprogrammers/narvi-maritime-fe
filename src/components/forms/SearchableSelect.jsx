import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  List,
  ListItem,
  Icon,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdKeyboardArrowDown } from 'react-icons/md';

const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  displayKey = "name",
  valueKey = "id",
  formatOption = (option) => `${option[valueKey]} - ${option[displayKey]}`,
  isLoading = false,
  onSearch,
  error,
  label,
  bg,
  color,
  borderColor,
  ...props
}) => {
  const defaultBg = useColorModeValue("white", "gray.800");
  const defaultColor = useColorModeValue("gray.700", "gray.100");
  const defaultBorderColor = useColorModeValue("gray.300", "gray.600");
  const highlightBg = useColorModeValue("blue.50", "blue.900");
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const highlightedItemRef = useRef(null);

  useEffect(() => {
    if (searchValue) {
      const filtered = options.filter(option =>
        formatOption(option).toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  // Exclude formatOption from deps to avoid infinite loops due to new function identity on each render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, options]);

  // When popover opens, set highlighted index to current value or 0; when options change, clamp index
  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex(opt => opt[valueKey] === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, valueKey, filteredOptions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedItemRef.current) {
      highlightedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex, isOpen]);

  // Load initial data when popover opens
  useEffect(() => {
    if (isOpen && onSearch && options.length === 0 && !isLoading) {
      onSearch(''); // Load initial data
    }
  }, [isOpen, onSearch, options.length, isLoading]);

  const selectedOption = options.find(option => option[valueKey] === value);

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setSearchValue("");
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    const n = filteredOptions.length;
    if (n === 0) {
      if (e.key === 'Escape' || e.key === 'Tab') {
        setIsOpen(false);
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
        handleSelect(filteredOptions[highlightedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  return (
    <Popover
      minW="100%"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      initialFocusRef={inputRef}
    >
      <PopoverTrigger>
        <Button
          w="100%"
          minW="100%"
          justifyContent="space-between"
          variant="outline"
          size="sm"
          bg={bg || defaultBg}
          color={color || defaultColor}
          borderColor={error ? "red.300" : (borderColor || defaultBorderColor)}
          _hover={{ borderColor: error ? "red.400" : (borderColor || defaultBorderColor) }}
          _focus={{ borderColor: "#1c4a95", boxShadow: "0 0 0 1px #1c4a95" }}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleTriggerKeyDown}
          borderRadius="md"
          fontWeight="normal"
          fontSize="sm"
          h="32px"
          {...props}
        >
          {selectedOption ? formatOption(selectedOption) : placeholder}
          {isLoading ? (
            <Spinner size="xs" />
          ) : (
            <Icon as={MdKeyboardArrowDown} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent w="100%" maxH="200px" overflowY="auto" borderRadius="md" minW="100%">
        <PopoverBody p={0}>
          <Input
            ref={inputRef}
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            border="none"
            borderRadius="0"
            borderBottom="1px"
            borderColor="gray.200"
            _focus={{ borderColor: "#1c4a95" }}
            px={3}
            py={2}
            fontSize="sm"
          />
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
                onClick={() => handleSelect(option)}
                borderBottom="1px"
                borderColor="gray.100"
                fontSize="sm"
              >
                {formatOption(option)}
              </ListItem>
            ))}
            {filteredOptions.length === 0 && (
              <ListItem px={3} py={2} color="gray.500" fontSize="sm">
                {isLoading ? 'Loading...' : 'No options found'}
              </ListItem>
            )}
          </List>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
