import React from "react";
import { Flex, Icon, Spinner, Text, Th, useColorModeValue } from "@chakra-ui/react";
import { MdArrowDownward, MdArrowUpward, MdUnfoldMore } from "react-icons/md";

// Server-side sortable header cell. Pass the same Th props the list uses (thProps) as extra props.
const LedgerSortableHeader = ({
  label,
  sortKey,
  sortBy,
  sortOrder,
  onSort,
  isPending = false,
  isDisabled = false,
  children,
  ...thProps
}) => {
  const isActive = sortBy === sortKey;
  const activeColor = useColorModeValue("blue.600", "blue.200");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const activate = () => {
    if (isDisabled || isPending) return;
    onSort?.(sortKey);
  };
  const ariaSort = isActive ? (sortOrder === "asc" ? "ascending" : "descending") : "none";

  return (
    <Th
      {...thProps}
      role="columnheader"
      tabIndex={isDisabled ? -1 : 0}
      aria-sort={ariaSort}
      aria-disabled={isDisabled || undefined}
      title={`Sort by ${label}`}
      cursor={isDisabled ? "default" : "pointer"}
      userSelect="none"
      color={isActive ? activeColor : thProps.color}
      _hover={isDisabled ? undefined : { bg: hoverBg }}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
    >
      <Flex align="center" gap="1" justify={thProps.isNumeric ? "flex-end" : "flex-start"}>
        <Text as="span" noOfLines={1} whiteSpace="nowrap">
          {children ?? label}
        </Text>
        {isPending && isActive ? (
          <Spinner boxSize="13px" flexShrink={0} />
        ) : (
          <Icon
            as={!isActive ? MdUnfoldMore : sortOrder === "asc" ? MdArrowUpward : MdArrowDownward}
            boxSize="14px"
            flexShrink={0}
            opacity={isActive ? 1 : 0.55}
          />
        )}
      </Flex>
    </Th>
  );
};

export default LedgerSortableHeader;
