import React from "react";
import { Badge } from "@chakra-ui/react";
import { normalizeStockStatusKey } from "../../constants/stockStatus";

export const STATUS_CONFIG = {
  released: {
    label: "Released",
    color: "cyan",
    bgColor: "#cfe2f3",
    textColor: "#000000",
    lightBg: "#cfe2f3",
  },
  pending: {
    label: "Pending",
    color: "blue",
    bgColor: "#c9daf7",
    textColor: "#000000",
    lightBg: "#c9daf7",
  },
  stock: {
    label: "Stock",
    color: "gray",
    bgColor: "#d8d8d8",
    textColor: "#000000",
    lightBg: "#d8d8d8",
  },
  on_shipping: {
    label: "On Shipping Instr",
    color: "orange",
    bgColor: "#fec02e",
    textColor: "#000000",
    lightBg: "#fec02e",
  },
  on_delivery: {
    label: "On Delivery Instr",
    color: "teal",
    bgColor: "#b7e1cd",
    textColor: "#000000",
    lightBg: "#b7e1cd",
  },
  in_transit: {
    label: "In Transit",
    color: "green",
    bgColor: "#92d059",
    textColor: "#000000",
    lightBg: "#92d059",
  },
  arrived: {
    label: "Arrived Dest",
    color: "gray",
    bgColor: "#a5a5a5",
    textColor: "#000000",
    lightBg: "#a5a5a5",
    useDarkText: true,
  },
  shipped: {
    label: "Shipped",
    color: "orange",
    bgColor: "#fce5ce",
    textColor: "#000000",
    lightBg: "#fce5ce",
  },
  delivered: {
    label: "Delivered",
    color: "pink",
    bgColor: "#f4cccd",
    textColor: "#000000",
    lightBg: "#f4cccd",
  },
  irregular: {
    label: "Irregularities",
    color: "red",
    bgColor: "#fe001b",
    textColor: "#000000",
    lightBg: "#fe001b",
    useDarkText: true,
  },
  cancelled: {
    label: "Cancelled",
    color: "purple",
    bgColor: "#9a00fb82",
    textColor: "#000000",
    lightBg: "#9a00fb82",
    useDarkText: true,
  },
};

export const STATUS_VARIATIONS = {
  stock: "stock",
  on_a_shipping_instr: "on_shipping",
  on_a_shipping_instruction: "on_shipping",
  on_shipping_instr: "on_shipping",
  on_shipping_instruction: "on_shipping",
  on_a_delivery_instr: "on_delivery",
  on_a_delivery_instruction: "on_delivery",
  on_delivery_instr: "on_delivery",
  on_delivery_instruction: "on_delivery",
  arrived_dest: "arrived",
  irregularities: "irregular",
  shipping_instr: "on_shipping",
  delivery_instr: "on_delivery",
  blank: "released",
};

export function StockStatusBadge({ statusStyle, children }) {
  return (
    <Badge
      size="sm"
      borderRadius="full"
      px="3"
      py="1"
      bg={statusStyle.bgColor}
      color={statusStyle.textColor}
      sx={{ color: statusStyle.textColor }}
    >
      {children}
    </Badge>
  );
}

export function getStockRowStatusStyle(status, fallbackBg = "white", fallbackText = "gray.600") {
  if (!status) {
    return {
      bgColor: fallbackBg,
      textColor: fallbackText,
      color: "gray",
      label: "-",
    };
  }

  let statusKey = normalizeStockStatusKey(status);
  if (!statusKey) {
    statusKey = String(status).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  }

  if (STATUS_VARIATIONS[statusKey]) {
    statusKey = STATUS_VARIATIONS[statusKey];
  }

  let config = STATUS_CONFIG[statusKey];
  if (!config) {
    const matchingKey = Object.keys(STATUS_CONFIG).find((key) => {
      const normalizedKey = key.toLowerCase();
      const normalizedStatus = statusKey.toLowerCase();
      return (
        normalizedStatus.includes(normalizedKey) ||
        normalizedKey.includes(normalizedStatus) ||
        normalizedStatus === normalizedKey
      );
    });
    config = matchingKey ? STATUS_CONFIG[matchingKey] : null;
  }
  return (
    config || {
      bgColor: fallbackBg,
      textColor: fallbackText,
      color: "gray",
      label: status || "-",
    }
  );
}
