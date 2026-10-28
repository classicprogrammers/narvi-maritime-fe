import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Input,
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
  useToast,
} from "@chakra-ui/react";
import clientShippingOrdersApi from "api/clientShippingOrders";
import { getSelectedPortalClientId } from "utils/portalClientSelection";
import {
  buildClientOrderEditForm,
  buildClientOrderUpdatePayload,
  formatChangeValue,
  validateClientOrderDates,
} from "utils/clientOrderUpdates";

const formatDateTime = (value) => {
  if (!value || value === false) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

function usePanelColors() {
  return {
    cardBg: useColorModeValue("white", "navy.800"),
    borderColor: useColorModeValue("secondaryGray.200", "whiteAlpha.200"),
    headingColor: useColorModeValue("navy.700", "white"),
    muted: useColorModeValue("secondaryGray.700", "secondaryGray.600"),
    toNarviBg: useColorModeValue("blue.50", "whiteAlpha.100"),
    toClientBg: useColorModeValue("gray.50", "whiteAlpha.50"),
  };
}

function PanelBox({ title, right, children }) {
  const { cardBg, borderColor, headingColor } = usePanelColors();
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

/** Shared submit: builds the changed-keys payload, posts it and reports the backend message as is. */
function useClientOrderSubmit(order, onSaved) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (initial, form) => {
    const dateError = validateClientOrderDates(form);
    if (dateError) {
      toast({ title: "Check the dates", description: dateError, status: "warning", duration: 5000, isClosable: true });
      return false;
    }
    const payload = buildClientOrderUpdatePayload(order.id, initial, form, getSelectedPortalClientId());
    if (!payload) {
      toast({ title: "Nothing to save", status: "info", duration: 3000, isClosable: true });
      return false;
    }
    setIsSaving(true);
    try {
      const res = await clientShippingOrdersApi.updateClientShippingOrderApi(payload);
      toast({ title: "Sent to Narvi", status: "success", duration: 3000, isClosable: true });
      await onSaved?.(res.order);
      return true;
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Please try again.",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { submit, isSaving };
}

const FIELD_LABEL_PROPS = {
  fontSize: "11px",
  fontWeight: "700",
  mb: 1,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

/** Client-editable fields. Render only when the order is editable. */
export function ClientOrderEditForm({ order, onSaved, onCancel }) {
  const { muted } = usePanelColors();
  const raw = order?._raw || order;
  const initial = useMemo(() => buildClientOrderEditForm(raw), [raw]);
  const [form, setForm] = useState(initial);
  const { submit, isSaving } = useClientOrderSubmit(order, onSaved);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const dateError = validateClientOrderDates(form);

  return (
    <PanelBox title="Edit order">
      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
        {[
          ["eta_date", "ETA"],
          ["etb", "ETB"],
          ["etd", "ETD"],
        ].map(([key, label]) => (
          <GridItem key={key}>
            <Text {...FIELD_LABEL_PROPS} color={muted}>
              {label}
            </Text>
            <Input size="sm" h="40px" type="date" value={form[key]} onChange={setField(key)} />
          </GridItem>
        ))}
        <GridItem colSpan={{ base: 1, md: 3 }}>
          <Text {...FIELD_LABEL_PROPS} color={muted}>
            Client Case / Invoice Ref
          </Text>
          <Input
            size="sm"
            h="40px"
            value={form.client_case_invoice_ref}
            onChange={setField("client_case_invoice_ref")}
          />
        </GridItem>
        <GridItem colSpan={{ base: 1, md: 3 }}>
          <Text {...FIELD_LABEL_PROPS} color={muted}>
            Vessel Agent Details
          </Text>
          <Textarea size="sm" rows={3} value={form.vsls_agent_dtls} onChange={setField("vsls_agent_dtls")} />
        </GridItem>
        <GridItem colSpan={{ base: 1, md: 3 }}>
          <Text {...FIELD_LABEL_PROPS} color={muted}>
            Remark to Narvi (optional)
          </Text>
          <Textarea
            size="sm"
            rows={2}
            placeholder="Add a note for Narvi about this change"
            value={form.remark_to_nm}
            onChange={setField("remark_to_nm")}
          />
        </GridItem>
      </Grid>
      {dateError ? (
        <Text fontSize="sm" color="red.500" mt={3}>
          {dateError}
        </Text>
      ) : null}
      <Flex justify="flex-end" gap={3} mt={4}>
        <Button size="sm" variant="outline" onClick={onCancel} isDisabled={isSaving}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="brand"
          isLoading={isSaving}
          isDisabled={Boolean(dateError)}
          onClick={async () => {
            const ok = await submit(initial, form);
            if (ok) onCancel?.();
          }}
        >
          Save changes
        </Button>
      </Flex>
    </PanelBox>
  );
}

/** Pending / seen status of the client's last change. */
export function ClientOrderSyncStatus({ twoWay }) {
  const { muted } = usePanelColors();
  if (!twoWay?.clientUpdatedAt) return null;
  return (
    <Flex align="center" gap={2} wrap="wrap" mb={4}>
      <Text fontSize="sm" color={muted}>
        Your last change: {formatDateTime(twoWay.clientUpdatedAt)}
      </Text>
      {twoWay.clientUpdatePending ? (
        <Badge colorScheme="orange" borderRadius="full" px={2.5}>
          Awaiting Narvi
        </Badge>
      ) : twoWay.seenByNarviAt ? (
        <Badge colorScheme="green" borderRadius="full" px={2.5}>
          Seen by Narvi {formatDateTime(twoWay.seenByNarviAt)}
        </Badge>
      ) : null}
    </Flex>
  );
}

/** Remarks dialog (newest first). "Remarks to Client" are read-only; the client can only write to Narvi. */
export function ClientOrderRemarks({ order, twoWay, onSaved }) {
  const { muted, toNarviBg, toClientBg, borderColor } = usePanelColors();
  const [text, setText] = useState("");
  const { submit, isSaving } = useClientOrderSubmit(order, onSaved);

  const remarks = twoWay?.remarks?.length
    ? twoWay.remarks
    : [twoWay?.remarkToClient && { ...twoWay.remarkToClient, direction: "to_client" },
       twoWay?.remarkToNm && { ...twoWay.remarkToNm, direction: "to_nm" }].filter(Boolean);

  return (
    <PanelBox title="Remarks">
      {remarks.length ? (
        <VStack align="stretch" spacing={2} maxH="280px" overflowY="auto" mb={twoWay?.isEditable ? 4 : 0}>
          {remarks.map((remark, index) => {
            const toNarvi = remark.direction === "to_nm";
            return (
              <Box
                key={remark.id ?? `${remark.direction}-${index}`}
                bg={toNarvi ? toNarviBg : toClientBg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="md"
                px={3}
                py={2}
              >
                <Flex justify="space-between" gap={2} wrap="wrap" mb={1}>
                  <Text fontSize="xs" fontWeight="700" color={muted}>
                    {toNarvi ? "Remark to Narvi" : "Remark to Client"}
                    {remark.author ? ` · ${remark.author}` : ""}
                  </Text>
                  <Text fontSize="xs" color={muted}>
                    {formatDateTime(remark.created_at)}
                  </Text>
                </Flex>
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {remark.text}
                </Text>
              </Box>
            );
          })}
        </VStack>
      ) : (
        <Text fontSize="sm" color={muted} mb={twoWay?.isEditable ? 4 : 0}>
          No remarks yet.
        </Text>
      )}
      {twoWay?.isEditable ? (
        <Flex gap={3} align="flex-end" direction={{ base: "column", md: "row" }}>
          <Textarea
            size="sm"
            rows={2}
            placeholder="Write a remark to Narvi"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            size="sm"
            variant="brand"
            flexShrink={0}
            isLoading={isSaving}
            isDisabled={!text.trim()}
            onClick={async () => {
              const ok = await submit({}, { remark_to_nm: text });
              if (ok) setText("");
            }}
          >
            Send
          </Button>
        </Flex>
      ) : null}
    </PanelBox>
  );
}

/** Client-visible change history from the detail call. */
export function ClientOrderChanges({ changes }) {
  const { muted } = usePanelColors();
  return (
    <PanelBox title="Changes">
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
                <Tr key={`${change.created_at}-${change.label}-${index}`}>
                  <Td whiteSpace="nowrap">{formatDateTime(change.created_at)}</Td>
                  <Td whiteSpace="nowrap">
                    <Badge colorScheme={change.source === "client" ? "blue" : "purple"} mr={2}>
                      {change.source === "client" ? "You" : "Narvi"}
                    </Badge>
                    {change.author || ""}
                  </Td>
                  <Td>{change.label || "-"}</Td>
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
    </PanelBox>
  );
}
