import React, { useState, useEffect } from "react";
import { MenuItem, Text } from "@chakra-ui/react";
import {
  STOCK_HUB_SORT_OPTIONS,
  isStockHubSortOption,
} from "../../constants/stockHubSort";

export default function StockHubSortMenuItems({ sortOption, onSelect }) {
  const [expanded, setExpanded] = useState(isStockHubSortOption(sortOption));

  useEffect(() => {
    if (isStockHubSortOption(sortOption)) {
      setExpanded(true);
    }
  }, [sortOption]);

  return (
    <>
      <MenuItem
        closeOnSelect={false}
        fontWeight="semibold"
        onClick={(event) => {
          event.preventDefault();
          setExpanded((prev) => !prev);
        }}
      >
        Sort by VIA HUB {expanded ? "▾" : "▸"}
      </MenuItem>
      {expanded &&
        STOCK_HUB_SORT_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            pl={8}
            fontWeight={sortOption === option.value ? "bold" : "normal"}
            bg={sortOption === option.value ? "blue.50" : undefined}
            onClick={() => onSelect(option.value)}
          >
            <Text fontSize="sm">{option.label}</Text>
          </MenuItem>
        ))}
    </>
  );
}
