import React, { useState, useEffect } from 'react';
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
  isRequired = false,
  label,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    if (searchValue) {
      const filtered = options.filter(option =>
        formatOption(option).toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchValue, options, formatOption]);

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

  return (
    <Popover 
      minW="100%" 
      isOpen={isOpen} 
      onClose={() => setIsOpen(false)} 
      placement="bottom-start"
    >
      <PopoverTrigger>
        <Button
          w="100%"
          minW="100%"
          justifyContent="space-between"
          variant="outline"
          size="sm"
          bg="white"
          borderColor={error ? "red.300" : "gray.300"}
          _hover={{ borderColor: error ? "red.400" : "gray.400" }}
          _focus={{ borderColor: "#1c4a95", boxShadow: "0 0 0 1px #1c4a95", bg: "#f0f4ff" }}
          onClick={() => setIsOpen(!isOpen)}
          borderRadius="md"
          fontWeight="normal"
          fontSize="sm"
          h="32px"
          isRequired={isRequired}
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
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
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
            {filteredOptions.map((option) => (
              <ListItem
                key={option[valueKey]}
                px={3}
                py={2}
                cursor="pointer"
                _hover={{ bg: "gray.100" }}
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
