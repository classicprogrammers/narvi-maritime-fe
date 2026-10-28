import React, { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { formatChangeValue, formatDateOnly, formatDateTimeDMY } from "utils/clientOrderUpdates";

/**
 * Two-way shipping order remarks and change history, shared by the client and admin portals.
 * `viewer` ("client" | "admin") only changes wording; the data shape is the same on both sides.
 */

/** Always "DD/MM/YYYY hh:mm AM/PM", whatever the browser locale. */
export const formatRemarkDateTime = formatDateTimeDMY;

export function useRemarkPanelColors() {
  return {
    cardBg: useColorModeValue("white", "navy.800"),
    borderColor: useColorModeValue("secondaryGray.200", "whiteAlpha.200"),
    headingColor: useColorModeValue("navy.700", "white"),
    muted: useColorModeValue("secondaryGray.700", "secondaryGray.600"),
    mineBg: useColorModeValue("blue.50", "whiteAlpha.200"),
    mineBorder: useColorModeValue("blue.200", "whiteAlpha.300"),
    otherBg: useColorModeValue("gray.100", "whiteAlpha.100"),
  };
}

export function RemarkPanelBox({ title, right, children }) {
  const { cardBg, borderColor, headingColor } = useRemarkPanelColors();
  return (
    <Box border="1px solid" borderColor={borderColor} borderRadius="12px" p={5} mb={5} bg={cardBg}>
      <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
        <Text fontSize="md" fontWeight="700" color={headingColor}>
          {title}
        </Text>
        {right}
      </Flex>
      {children}
    </Box>
  );
}

const REMARK_VIEWER_TEXT = {
  client: {
    subtitle: "Your conversation with Narvi. Oldest message first.",
    placeholder: "Write a message to Narvi",
    mineDirection: "to_nm",
    mineName: "You",
    otherName: "Narvi",
  },
  admin: {
    subtitle: "Conversation with the client. Oldest message first.",
    placeholder: "Write a message to the client",
    mineDirection: "to_client",
    mineName: "Narvi",
    otherName: "Client",
  },
};

const senderLabel = (name, author) =>
  author && author !== name ? `${name} · ${author}` : name;

/**
 * Remarks as a conversation, oldest message first. Your own messages sit on the right,
 * the other side's on the left. Each side writes in one direction only:
 * the client writes to Narvi, staff write to the client.
 * onSend(text) resolves to true when the remark was saved.
 */
export function ShippingOrderRemarksPanel({ twoWay, viewer = "client", canWrite = false, isSending = false, onSend }) {
  const { muted, mineBg, mineBorder, otherBg, borderColor } = useRemarkPanelColors();
  const [text, setText] = useState("");
  const listRef = useRef(null);
  const copy = REMARK_VIEWER_TEXT[viewer] || REMARK_VIEWER_TEXT.client;

  // Backend returns newest first; a conversation reads top to bottom.
  const remarks = (
    twoWay?.remarks?.length
      ? twoWay.remarks
      : [
          twoWay?.remarkToClient && { ...twoWay.remarkToClient, direction: "to_client" },
          twoWay?.remarkToNm && { ...twoWay.remarkToNm, direction: "to_nm" },
        ].filter(Boolean)
  )
    .slice()
    .reverse();

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [remarks.length]);

  return (
    <RemarkPanelBox title="Remarks">
      <Text fontSize="xs" color={muted} mt="-2" mb={3}>
        {copy.subtitle}
      </Text>
      {remarks.length ? (
        <VStack
          ref={listRef}
          align="stretch"
          spacing={3}
          maxH="320px"
          overflowY="auto"
          mb={canWrite ? 4 : 0}
        >
          {remarks.map((remark, index) => {
            const isMine = remark.direction === copy.mineDirection;
            return (
              <Flex
                key={remark.id ?? `${remark.direction}-${index}`}
                justify={isMine ? "flex-end" : "flex-start"}
              >
                <Box
                  maxW={{ base: "92%", md: "75%" }}
                  bg={isMine ? mineBg : otherBg}
                  border="1px solid"
                  borderColor={isMine ? mineBorder : borderColor}
                  borderRadius="lg"
                  borderTopRightRadius={isMine ? "sm" : "lg"}
                  borderTopLeftRadius={isMine ? "lg" : "sm"}
                  px={3}
                  py={2}
                >
                  <Flex justify="space-between" gap={4} mb={1}>
                    <Text fontSize="xs" fontWeight="700" color={muted}>
                      {isMine
                        ? senderLabel(copy.mineName, remark.author)
                        : senderLabel(copy.otherName, remark.author)}
                    </Text>
                    <Text fontSize="xs" color={muted} whiteSpace="nowrap">
                      {formatRemarkDateTime(remark.created_at)}
                    </Text>
                  </Flex>
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {remark.text}
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </VStack>
      ) : (
        <Text fontSize="sm" color={muted} mb={canWrite ? 4 : 0}>
          No messages yet.
        </Text>
      )}
      {canWrite ? (
        <Flex gap={3} align="flex-end" direction={{ base: "column", md: "row" }}>
          <Textarea
            size="sm"
            rows={2}
            maxLength={2000}
            placeholder={copy.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            size="sm"
            variant="brand"
            flexShrink={0}
            isLoading={isSending}
            isDisabled={!text.trim()}
            onClick={async () => {
              const ok = await onSend?.(text);
              if (ok) setText("");
            }}
          >
            Send
          </Button>
        </Flex>
      ) : null}
    </RemarkPanelBox>
  );
}

const CHANGE_SOURCE_LABEL = {
  client: { client: "You", staff: "Narvi" },
  admin: { client: "Client", staff: "Narvi" },
};

/** Change history from the detail call: {source: client|staff, label, old_value, new_value, author, created_at}. */
export function ShippingOrderChangesPanel({ changes, viewer = "client" }) {
  const { muted } = useRemarkPanelColors();
  const sourceLabels = CHANGE_SOURCE_LABEL[viewer] || CHANGE_SOURCE_LABEL.client;
  return (
    <RemarkPanelBox title="Changes">
      {changes?.length ? (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>When</Th>
                <Th>By</Th>
                <Th>Field</Th>
                <Th>Old value</Th>
                <Th>New value</Th>
              </Tr>
            </Thead>
            <Tbody>
              {changes.map((change, index) => (
                <Tr key={change.id ?? `${change.created_at}-${change.label}-${index}`}>
                  <Td whiteSpace="nowrap">
                    {formatDateOnly(change.created_at) || formatRemarkDateTime(change.created_at)}
                  </Td>
                  <Td whiteSpace="nowrap">
                    <Badge colorScheme={change.source === "client" ? "blue" : "purple"} mr={2}>
                      {change.source === "client" ? sourceLabels.client : sourceLabels.staff}
                    </Badge>
                    {change.author || ""}
                  </Td>
                  <Td>{change.label || change.field || "-"}</Td>
                  <Td whiteSpace="pre-wrap">{formatChangeValue(change.old_value)}</Td>
                  <Td whiteSpace="pre-wrap">{formatChangeValue(change.new_value)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ) : (
        <Text fontSize="sm" color={muted}>
          No changes recorded yet.
        </Text>
      )}
    </RemarkPanelBox>
  );
}
