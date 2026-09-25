import React from "react";
import { Badge, Box, Flex, Text, useColorModeValue } from "@chakra-ui/react";
import QuotationStateBadge from "./QuotationStateBadge";
import { quotationReference, quotationStateLabel } from "./quotationUtils";

export default function RevisionTimeline({ versions = [], activeId, onSelect }) {
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const hoverBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const activeBg = useColorModeValue("blue.50", "whiteAlpha.200");
  const muted = useColorModeValue("gray.500", "gray.400");

  if (!versions.length) {
    return (
      <Text fontSize="sm" color={muted}>
        No versions found.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap={2}>
      {versions.map((version) => {
        const active = String(version.id) === String(activeId);
        return (
          <Flex
            key={version.id ?? `${version.revision_no}-${version.name}`}
            align="center"
            justify="space-between"
            gap={3}
            px={3}
            py={3}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="10px"
            bg={active ? activeBg : "transparent"}
            cursor="pointer"
            _hover={{ bg: hoverBg }}
            onClick={() => onSelect?.(version)}
          >
            <Box minW={0}>
              <Text fontSize="sm" fontWeight="700" noOfLines={1}>
                {quotationReference(version)}
              </Text>
              <Text fontSize="xs" color={muted}>
                Revision {version.revision_no ?? 0}
              </Text>
            </Box>
            <Flex align="center" gap={2} flexShrink={0}>
              {version.is_current_revision ? <Badge colorScheme="green">Current</Badge> : null}
              <QuotationStateBadge state={version.state} label={quotationStateLabel(version)} />
            </Flex>
          </Flex>
        );
      })}
    </Flex>
  );
}
