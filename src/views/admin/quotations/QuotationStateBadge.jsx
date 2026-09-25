import React from "react";
import { Badge } from "@chakra-ui/react";
import { quotationStateColor } from "./quotationUtils";

export default function QuotationStateBadge({ state, label }) {
  return (
    <Badge colorScheme={quotationStateColor(state)} textTransform="none" px={2} py={0.5} borderRadius="6px">
      {label || state || "—"}
    </Badge>
  );
}
