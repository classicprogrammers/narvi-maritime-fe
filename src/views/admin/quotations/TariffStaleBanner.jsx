import { Alert, AlertIcon, Text } from "@chakra-ui/react";
import { STALE_TARIFF_WARNING, isRateOld } from "utils/tariffRateAge";

// Warning shown above the tariff table when the oldest rate is past the age threshold.
export default function TariffStaleBanner({ oldestLastUpdate }) {
  if (!isRateOld(oldestLastUpdate)) return null;

  return (
    <Alert status="warning" variant="subtle" role="status" borderRadius="md" mb="4" alignItems="flex-start">
      <AlertIcon />
      <Text fontWeight="semibold">{STALE_TARIFF_WARNING}</Text>
    </Alert>
  );
}
