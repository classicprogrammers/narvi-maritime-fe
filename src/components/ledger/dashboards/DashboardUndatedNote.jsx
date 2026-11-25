import React from "react";
import { Text, useColorModeValue } from "@chakra-ui/react";
import { formatUndatedNote } from "utils/ledgerDashboardData";

// Small muted note for records without a date. Renders nothing when there are none or the backend sent no block.
export default function DashboardUndatedNote({ undated, ...rest }) {
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const text = formatUndatedNote(undated);
  if (!text) return null;
  return (
    <Text fontSize="xs" color={muted} mt={2} {...rest}>
      {text}
    </Text>
  );
}
