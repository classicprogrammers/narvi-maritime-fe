import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Flex,
  Grid,
  GridItem,
  Input,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import clientShippingOrdersApi from "api/clientShippingOrders";
import {
  RemarkPanelBox,
  ShippingOrderChangesPanel,
  ShippingOrderRemarksPanel,
  formatRemarkDateTime,
  useRemarkPanelColors,
} from "components/shipping-order/ShippingOrderRemarksPanels";
import { getSelectedPortalClientId } from "utils/portalClientSelection";
import {
  buildClientOrderEditForm,
  buildClientOrderUpdatePayload,
  validateClientOrderDates,
} from "utils/clientOrderUpdates";

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
  const { muted } = useRemarkPanelColors();
  const raw = order?._raw || order;
  const initial = useMemo(() => buildClientOrderEditForm(raw), [raw]);
  const [form, setForm] = useState(initial);
  const { submit, isSaving } = useClientOrderSubmit(order, onSaved);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  // The form opens below the order details; bring it into view.
  const formRef = useRef(null);
  useEffect(() => {
    formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, []);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const dateError = validateClientOrderDates(form);

  return (
    <div ref={formRef}>
    <RemarkPanelBox title="Edit order">
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
    </RemarkPanelBox>
    </div>
  );
}

/** Pending / seen status of the client's last change. */
export function ClientOrderSyncStatus({ twoWay }) {
  const { muted } = useRemarkPanelColors();
  if (!twoWay?.clientUpdatedAt) return null;
  return (
    <Flex align="center" gap={2} wrap="wrap" mb={4}>
      <Text fontSize="sm" color={muted}>
        Your last change: {formatRemarkDateTime(twoWay.clientUpdatedAt)}
      </Text>
      {twoWay.clientUpdatePending ? (
        <Badge colorScheme="orange" borderRadius="full" px={2.5}>
          Awaiting Narvi
        </Badge>
      ) : twoWay.seenByNarviAt ? (
        <Badge colorScheme="green" borderRadius="full" px={2.5}>
          Seen by Narvi {formatRemarkDateTime(twoWay.seenByNarviAt)}
        </Badge>
      ) : null}
    </Flex>
  );
}

/** Remarks dialog for the client: "Remarks to Client" are read-only; the client can only write to Narvi. */
export function ClientOrderRemarks({ order, twoWay, onSaved }) {
  const { submit, isSaving } = useClientOrderSubmit(order, onSaved);
  return (
    <ShippingOrderRemarksPanel
      twoWay={twoWay}
      viewer="client"
      canWrite={Boolean(twoWay?.isEditable)}
      isSending={isSaving}
      onSend={(text) => submit({}, { remark_to_nm: text })}
    />
  );
}

/** Client-visible change history from the detail call. */
export function ClientOrderChanges({ changes }) {
  return <ShippingOrderChangesPanel changes={changes} viewer="client" />;
}
