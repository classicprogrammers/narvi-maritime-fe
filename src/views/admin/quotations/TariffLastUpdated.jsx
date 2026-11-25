import React from "react";
import { Badge, HStack, Text, Tooltip, useColorModeValue } from "@chakra-ui/react";
import {
  OLD_RATE_HINT,
  RATE_AGE,
  UNKNOWN_LAST_UPDATE_TEXT,
  formatLastUpdate,
  getRateAgeStatus,
} from "utils/tariffRateAge";

/** "Last Updated" cell for the tariff tables: date, muted dash when unknown, "Old" badge when stale. */
export function TariffLastUpdated({ value }) {
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const oldColor = useColorModeValue("orange.600", "orange.300");
  const status = getRateAgeStatus(value);

  if (status === RATE_AGE.UNKNOWN) {
    return (
      <Text as="span" color={mutedColor} whiteSpace="nowrap" aria-label="Last updated unknown">
        {UNKNOWN_LAST_UPDATE_TEXT}
      </Text>
    );
  }

  const isOld = status === RATE_AGE.OLD;
  return (
    <HStack spacing="2" whiteSpace="nowrap" justify="flex-start">
      <Text as="span" color={isOld ? oldColor : undefined}>
        {formatLastUpdate(value)}
      </Text>
      {isOld && (
        <Tooltip label={OLD_RATE_HINT} hasArrow>
          <Badge
            colorScheme="orange"
            variant="subtle"
            fontSize="2xs"
            px="2"
            py="0.5"
            borderRadius="md"
            textTransform="uppercase"
          >
            Old
          </Badge>
        </Tooltip>
      )}
    </HStack>
  );
}

export const LAST_UPDATED_COLUMN = {
  key: "last_update",
  label: "Last Updated",
  renderCell: (row) => <TariffLastUpdated value={row.last_update} />,
};

export default TariffLastUpdated;
