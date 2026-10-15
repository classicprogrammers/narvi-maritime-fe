import React from "react";
import { Icon, IconButton, Menu, MenuButton, MenuItem, MenuList, Portal } from "@chakra-ui/react";
import { MdFilterAlt } from "react-icons/md";

/** Header icon with an Empty / Filled dropdown (same behaviour as the stock list headers). */
export default function ShippingOrderColumnEmptyFilter({ label, value, onChange }) {
  const isActive = value === "empty" || value === "not_empty";
  return (
    <Menu isLazy placement="bottom-start" gutter={4} strategy="fixed">
      <MenuButton
        as={IconButton}
        aria-label={
          value === "empty"
            ? `${label}: showing empty values`
            : value === "not_empty"
              ? `${label}: showing values that are filled in`
              : `Filter ${label} by empty or filled`
        }
        icon={<Icon as={MdFilterAlt} boxSize="14px" />}
        size="xs"
        variant="ghost"
        minW="20px"
        w="20px"
        h="20px"
        p={0}
        flexShrink={0}
        color={isActive ? "blue.700" : "gray.500"}
        bg={isActive ? "blue.100" : "transparent"}
        _hover={{ bg: isActive ? "blue.200" : "blackAlpha.100" }}
        onClick={(event) => event.stopPropagation()}
      />
      <Portal>
        <MenuList
          minW="168px"
          zIndex={2000}
          bg="white"
          boxShadow="lg"
          textTransform="none"
          fontWeight="normal"
          fontSize="sm"
          color="gray.800"
        >
          <MenuItem
            fontSize="sm"
            fontWeight={value === "empty" ? "700" : "400"}
            onClick={() => onChange(value === "empty" ? "" : "empty")}
          >
            Empty
          </MenuItem>
          <MenuItem
            fontSize="sm"
            fontWeight={value === "not_empty" ? "700" : "400"}
            onClick={() => onChange(value === "not_empty" ? "" : "not_empty")}
          >
            Filled
          </MenuItem>
          {isActive && (
            <MenuItem
              fontSize="sm"
              color="red.600"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange("")}
            >
              Clear
            </MenuItem>
          )}
        </MenuList>
      </Portal>
    </Menu>
  );
}
