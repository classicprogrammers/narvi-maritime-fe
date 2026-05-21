import React from "react";
import { Icon, IconButton, Text, Tooltip } from "@chakra-ui/react";
import { MdOpenInNew } from "react-icons/md";
import {
  openShippingOrdersFiltered,
  resolveSoFilterFromStockItem,
} from "../../utils/shippingOrderListState";

/**
 * Clickable SO number — opens /admin/shipping-orders in a new tab, filtered to that SO.
 */
export default function StockSoNumberLink({ item, label, children, textProps = {} }) {
  const filter = resolveSoFilterFromStockItem(item);
  const display = label ?? children ?? "-";
  const isEmpty = !display || display === "-";

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!filter) return;
    openShippingOrdersFiltered(filter);
  };

  if (!filter || isEmpty) {
    return <Text {...textProps}>{display}</Text>;
  }

  return (
    <Text
      as="button"
      type="button"
      {...textProps}
      color="blue.500"
      cursor="pointer"
      textAlign="left"
      title={`Open ${display} in Shipping Orders (new tab)`}
      _hover={{ textDecoration: "underline" }}
      onClick={handleClick}
    >
      {display}
    </Text>
  );
}

/** Icon button beside SO inputs on create/edit forms. */
export function StockSoNumberOpenButton({ item, size = "xs", ...btnProps }) {
  const filter = resolveSoFilterFromStockItem(item);
  if (!filter) return null;

  return (
    <Tooltip label="Open in Shipping Orders (new tab)" hasArrow>
      <IconButton
        icon={<Icon as={MdOpenInNew} />}
        size={size}
        variant="ghost"
        colorScheme="blue"
        aria-label="Open shipping order list in new tab"
        onClick={(e) => {
          e.stopPropagation();
          openShippingOrdersFiltered(filter);
        }}
        {...btnProps}
      />
    </Tooltip>
  );
}
