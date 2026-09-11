import React from "react";
import { Box, Button, Flex, Spinner, Text, useColorModeValue } from "@chakra-ui/react";

export function useClientPortalTableColors() {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const tableHeaderBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const tableRowHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const tableRowEvenBg = useColorModeValue("blackAlpha.50", "whiteAlpha.50");
  const tableOverlayBg = useColorModeValue("whiteAlpha.800", "blackAlpha.500");
  const tableBorderColor = useColorModeValue(
    "rgba(226, 232, 240, 0.85)",
    "rgba(255, 255, 255, 0.14)"
  );
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  return {
    cardBg,
    borderColor,
    tableHeaderBg,
    tableRowHoverBg,
    tableRowEvenBg,
    tableOverlayBg,
    tableBorderColor,
    muted,
  };
}

export const getClientPortalTableSx = ({ tableBorderColor, tableHeaderBg }) => ({
  tableLayout: "auto",
  thead: {
    position: "sticky",
    top: 0,
    zIndex: 3,
  },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 3,
    borderColor: `${tableBorderColor} !important`,
    borderRight: `1px solid ${tableBorderColor} !important`,
    borderBottom: `1px solid ${tableBorderColor} !important`,
    fontSize: "11px",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    py: 3,
    bg: tableHeaderBg,
  },
  td: {
    borderColor: `${tableBorderColor} !important`,
    borderRight: `1px solid ${tableBorderColor} !important`,
    borderBottom: `1px solid ${tableBorderColor} !important`,
    fontSize: "12px",
    py: 2.5,
    verticalAlign: "middle",
  },
  "th:last-child, td:last-child": {
    borderRight: "none",
  },
});

export default function ClientPortalTableShell({
  isLoading,
  hasRows,
  loadingLabel,
  emptyLabel,
  pageStart,
  pageEnd,
  totalCount,
  currentPage,
  totalPages,
  onChangePage,
  children,
}) {
  const {
    cardBg,
    borderColor,
    tableOverlayBg,
    tableBorderColor,
    muted,
  } = useClientPortalTableColors();

  return (
    <Box
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="16px"
      position="relative"
      overflow="hidden"
      minH={isLoading && !hasRows ? "240px" : undefined}
    >
      {isLoading && (
        <Flex
          position={hasRows ? "absolute" : "relative"}
          inset={hasRows ? 0 : undefined}
          minH={hasRows ? undefined : "240px"}
          align="center"
          justify="center"
          gap={3}
          bg={hasRows ? tableOverlayBg : undefined}
          zIndex={4}
        >
          <Spinner size="sm" />
          <Text fontSize="sm" color={muted}>
            {loadingLabel}
          </Text>
        </Flex>
      )}
      {!isLoading && !hasRows ? (
        <Text px={4} py={10} fontSize="sm" color={muted} textAlign="center">
          {emptyLabel}
        </Text>
      ) : hasRows ? (
        <Box
          maxH={{ base: "62vh", md: "calc(100vh - 340px)" }}
          overflowY="auto"
          overflowX="auto"
          sx={{
            "&::-webkit-scrollbar": { height: "8px", width: "8px" },
            "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "4px" },
          }}
        >
          {children}
        </Box>
      ) : null}
      <Flex
        px={4}
        py={3}
        justify="space-between"
        align="center"
        direction={{ base: "column", md: "row" }}
        gap={2}
        borderTop="1px solid"
        borderColor={tableBorderColor}
      >
        <Text fontSize="xs" color={muted}>
          {isLoading ? "Loading..." : `Showing ${pageStart}-${pageEnd} of ${totalCount} entries`}
        </Text>
        <Flex gap={1} align="center" wrap="wrap" justify="center">
          <Button
            size="xs"
            variant="outline"
            onClick={() => onChangePage(1)}
            isDisabled={isLoading || currentPage <= 1}
          >
            First
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => onChangePage(Math.max(1, currentPage - 1))}
            isDisabled={isLoading || currentPage <= 1}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <Button
                key={pageNum}
                size="xs"
                variant={currentPage === pageNum ? "solid" : "outline"}
                colorScheme={currentPage === pageNum ? "blue" : "gray"}
                onClick={() => onChangePage(pageNum)}
                isDisabled={isLoading}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            size="xs"
            variant="outline"
            onClick={() => onChangePage(Math.min(totalPages, currentPage + 1))}
            isDisabled={isLoading || currentPage >= totalPages}
          >
            Next
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => onChangePage(totalPages)}
            isDisabled={isLoading || currentPage >= totalPages}
          >
            Last
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
