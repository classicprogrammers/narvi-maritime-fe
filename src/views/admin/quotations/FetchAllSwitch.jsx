import React from "react";
import { HStack, Switch, Text, useColorModeValue } from "@chakra-ui/react";

/** "Fetch all" toggle as in the stock list: only usable while a filter is applied. */
export default function FetchAllSwitch({ isChecked, isEnabled, onChange }) {
  const textColor = useColorModeValue("gray.700", "white");
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  return (
    <HStack spacing="2" align="center" opacity={isEnabled ? 1 : 0.5}>
      <Text fontSize="sm" color={textColor} fontWeight="600">
        Fetch all
      </Text>
      <Switch
        size="md"
        colorScheme="green"
        isChecked={isChecked}
        isDisabled={!isEnabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <Text fontSize="xs" color={mutedColor}>
        {!isEnabled
          ? "Apply a filter to enable fetch all"
          : isChecked
            ? "Loading all matching records"
            : "Loading records page by page"}
      </Text>
    </HStack>
  );
}
