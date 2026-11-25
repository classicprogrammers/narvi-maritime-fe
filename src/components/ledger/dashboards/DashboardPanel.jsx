import React from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card";
import { DASHBOARD_NOT_AVAILABLE_TEXT, dashboardErrorMessage } from "utils/ledgerDashboardData";

export { DASHBOARD_NOT_AVAILABLE_TEXT, dashboardErrorMessage };
export const DASHBOARD_EMPTY_TEXT = "No data for the selected period.";

// Card wrapper with loading / error / empty / content states (spec C1).
// hasData: a response has been received. Loading with data dims it (opacity 0.6); without data shows a spinner.
export default function DashboardPanel({
  title,
  actions,
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyText = DASHBOARD_EMPTY_TEXT,
  hasData = true,
  onRetry,
  children,
  ...rest
}) {
  const titleColor = useColorModeValue("secondaryGray.900", "white");
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const headBg = useColorModeValue("gray.50", "navy.900");
  const hoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const emptyBorder = useColorModeValue("secondaryGray.300", "whiteAlpha.200");

  let body = null;
  if (error && !isLoading) {
    body = (
      <Alert status="error" borderRadius="12px" alignItems="center">
        <AlertIcon />
        <AlertDescription flex="1">{dashboardErrorMessage(error)}</AlertDescription>
        {onRetry ? (
          <Button size="sm" ml={3} onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </Alert>
    );
  } else if (isLoading && !hasData) {
    body = (
      <Flex align="center" justify="center" direction="column" gap={3} py={10}>
        <Spinner color="brand.500" />
        <Text fontSize="sm" color={muted}>
          Loading...
        </Text>
      </Flex>
    );
  } else if (hasData && isEmpty) {
    body = (
      <Flex align="center" justify="center" py={10} border="1px dashed" borderColor={emptyBorder} borderRadius="12px">
        <Text fontSize="sm" color={muted}>
          {emptyText}
        </Text>
      </Flex>
    );
  } else if (hasData) {
    body = (
      <Box opacity={isLoading ? 0.6 : 1} transition="opacity 0.15s" aria-busy={isLoading || undefined}>
        {children}
      </Box>
    );
  }

  return (
    <Card
      p={{ base: "16px", md: "20px" }}
      sx={{
        // Shared table polish: numerals line up, header stays visible while the body scrolls, rows highlight on hover.
        "& table": { fontVariantNumeric: "tabular-nums" },
        "& .chakra-table__container": { maxH: "70vh", overflowY: "auto" },
        "& thead th": { position: "sticky", top: 0, zIndex: 3, bg: headBg, color: muted },
        "& tbody tr:hover td": { bg: hoverBg },
      }}
      {...rest}
    >
      {title || actions ? (
        <Flex align="center" justify="space-between" mb={4} gap={3} wrap="wrap">
          {title ? (
            <Heading as="h3" size="md" color={titleColor}>
              {title}
            </Heading>
          ) : (
            <span />
          )}
          {actions}
        </Flex>
      ) : null}
      {body}
    </Card>
  );
}
