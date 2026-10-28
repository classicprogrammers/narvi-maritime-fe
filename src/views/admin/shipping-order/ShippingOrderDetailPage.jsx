import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { MdArrowBack, MdDelete, MdDownload, MdEdit } from "react-icons/md";
import { useHistory, useParams } from "react-router-dom";
import Card from "components/card/Card";
import ShippingOrderStockList from "../../../components/shipping-order/ShippingOrderStockList";
import {
  ShippingOrderChangesPanel,
  ShippingOrderRemarksPanel,
  formatRemarkDateTime,
} from "../../../components/shipping-order/ShippingOrderRemarksPanels";
import {
  deleteShippingOrder,
  downloadShippingOrderAttachmentApi,
  downloadShippingOrderCiplApi,
  getShippingOrderById,
  getShippingOrderStockApi,
  markShippingOrderSeenApi,
  resolveShippingPackageDownloadUrl,
  updateShippingOrder,
} from "../../../api/shippingOrders";
import { resolveShippingOrderDownloadFilename } from "../../../utils/shippingOrderAttachments";
import { getAdminOrderTwoWayState, shouldMarkAdminOrderSeen } from "../../../utils/clientOrderUpdates";
import {
  formatServiceBoatPaidByLabel,
  formatShippingOrderDestinationDisplay,
  formatShippingOrderDestinationTypeLabel,
  formatShippingOrderDisplayDate,
  formatShippingOrderStatusColor,
  formatShippingOrderStatusLabel,
  isCostConfirmedToClient,
  isDeliveryViaServiceBoat,
  normalizeOrder,
} from "./shippingOrderUtils";

const unwrapOrderPayload = (payload) => {
  if (!payload) return null;
  const nested = payload.order;
  if (Array.isArray(nested)) {
    return nested.find((item) => item && typeof item === "object") || null;
  }
  if (nested && typeof nested === "object") return nested;
  if (payload.id != null && (payload.so_id != null || Array.isArray(payload.stock_list))) {
    return payload;
  }
  return null;
};

const prettyValue = (value) => {
  if (value == null || value === false || value === "") return "—";
  const text = String(value).trim();
  return text || "—";
};

const DetailField = ({ label, children, fullWidth = false }) => {
  const labelColor = useColorModeValue("gray.500", "gray.400");
  const valueColor = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.100", "whiteAlpha.200");
  return (
    <GridItem colSpan={fullWidth ? { base: 1, md: 2 } : 1}>
      <Flex py="3" px="1" borderBottom="1px" borderColor={borderColor} align="flex-start" gap={4}>
        <Text
          fontSize="xs"
          fontWeight="700"
          letterSpacing="0.04em"
          color={labelColor}
          minW={{ base: "132px", md: "168px" }}
          flexShrink={0}
          pt="1px"
        >
          {label}
        </Text>
        <Box color={valueColor} fontSize="sm" whiteSpace="pre-wrap" flex="1" minW={0}>
          {children}
        </Box>
      </Flex>
    </GridItem>
  );
};

export default function ShippingOrderDetailPage() {
  const { id } = useParams();
  const history = useHistory();
  const toast = useToast();
  const cancelDeleteRef = useRef(null);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingFileKey, setDownloadingFileKey] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSendingRemark, setIsSendingRemark] = useState(false);
  /** Set when this visit marked the client's change as seen, so staff still see it was new. */
  const [clientUpdateSeenNow, setClientUpdateSeenNow] = useState(null);

  const headingColor = useColorModeValue("secondaryGray.900", "white");
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");

  const goToList = useCallback(() => {
    history.push("/admin/shipping-orders");
  }, [history]);

  useEffect(() => {
    setClientUpdateSeenNow(null);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      if (id == null || id === "") {
        setLoadError("Missing shipping order id.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await getShippingOrderById(id);
        const raw = unwrapOrderPayload(response);
        let normalized = normalizeOrder(raw);
        if (!normalized) {
          throw new Error("Shipping order not found");
        }
        if (
          Number(normalized.stock_item_count) > 0 &&
          (!Array.isArray(normalized.stock_list) || normalized.stock_list.length === 0)
        ) {
          try {
            const stockRes = await getShippingOrderStockApi(
              normalized.id,
              normalized.stock_items_url
            );
            normalized = {
              ...normalized,
              stock_list: stockRes.stock_list || [],
              stock_item_count:
                stockRes.count ?? stockRes.stock_list?.length ?? normalized.stock_item_count,
            };
          } catch (stockErr) {
            console.error("Failed to load shipping order stock", stockErr);
          }
        }
        if (cancelled) return;
        setOrder(normalized);
        // Only opening the detail marks the client's change as seen; the list never does.
        if (shouldMarkAdminOrderSeen(raw)) {
          markShippingOrderSeenApi(raw.id)
            .then((res) => {
              if (cancelled) return;
              setClientUpdateSeenNow({
                seenByNarviAt: res?.seen_by_narvi_at || new Date().toISOString(),
              });
            })
            .catch((seenErr) => console.error("Failed to mark client update as seen", seenErr));
        }
      } catch (error) {
        if (cancelled) return;
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.result?.message ||
          error?.message ||
          "Unable to load shipping order";
        setLoadError(message);
        setOrder(null);
        toast({
          title: "Unable to load shipping order",
          description: message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadOrder();
    return () => {
      cancelled = true;
    };
  }, [id, toast, reloadKey]);

  const twoWay = useMemo(() => {
    const state = getAdminOrderTwoWayState(order?._raw);
    return clientUpdateSeenNow
      ? { ...state, clientUpdateUnseen: false, seenByNarviAt: clientUpdateSeenNow.seenByNarviAt }
      : state;
  }, [order, clientUpdateSeenNow]);

  const handleSendRemarkToClient = async (text) => {
    if (!order?.id) return false;
    setIsSendingRemark(true);
    try {
      await updateShippingOrder(order.id, { remark_to_client: text.trim() });
      toast({ title: "Remark sent to client", status: "success", duration: 3000, isClosable: true });
      setReloadKey((key) => key + 1);
      return true;
    } catch (error) {
      toast({
        title: "Unable to send remark",
        description:
          error?.response?.data?.result?.message ||
          error?.response?.data?.message ||
          error?.message ||
          "Please try again.",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      return false;
    } finally {
      setIsSendingRemark(false);
    }
  };

  const handleDownloadFile = async (file, kind) => {
    if (!order?.id || file?.id == null) return;
    const key = `${kind}-${order.id}-${file.id}`;
    setDownloadingFileKey(key);
    try {
      const response =
        kind === "cipl"
          ? await downloadShippingOrderCiplApi(order.id, file.id, true)
          : await downloadShippingOrderAttachmentApi(order.id, file.id, true);
      if (!(response?.data instanceof Blob)) {
        throw new Error("Could not download file.");
      }
      const filename = resolveShippingOrderDownloadFilename(file, response);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Download failed",
        description: err?.message || "Unable to download file.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setDownloadingFileKey(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!order?.id) return;
    setIsDeleting(true);
    try {
      await deleteShippingOrder(order.id);
      toast({
        title: "Shipping order deleted",
        description: `${order.so_number || `SO-${order.id}`} has been deleted.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      goToList();
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error?.response?.data?.result?.message ||
          error?.message ||
          "Unable to delete shipping order",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
      onDeleteClose();
    }
  };

  const attachments = order?.existingAttachments || [];
  const ciplFiles = order?.existingCiplFiles || [];
  const packageUrl = resolveShippingPackageDownloadUrl(
    order?.shipping_package?.full_download_url || order?.shipping_package?.url
  );

  const renderFileList = (files, kind, emptyLabel) => {
    if (!files.length) {
      return <Text color="gray.400">{emptyLabel}</Text>;
    }
    return (
      <Box>
        {files.map((file) => {
          const key = `${kind}-${order.id}-${file.id}`;
          return (
            <HStack key={file.id || file.filename} justify="space-between" py="1" spacing="3">
              <Text fontSize="sm" noOfLines={1} title={file.filename || file.name}>
                {file.filename || file.name || `File ${file.id}`}
              </Text>
              <IconButton
                size="xs"
                aria-label="Download file"
                icon={<Icon as={MdDownload} />}
                variant="ghost"
                colorScheme="blue"
                isLoading={downloadingFileKey === key}
                onClick={() => handleDownloadFile(file, kind)}
              />
            </HStack>
          );
        })}
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="4">
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="4">
        <Flex direction="column" align="flex-start" gap={4} minH="200px">
          <Button leftIcon={<Icon as={MdArrowBack} />} variant="ghost" size="sm" onClick={goToList}>
            Back
          </Button>
          <Text color="red.500">{loadError || "Shipping order not found."}</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="4" pb="8">
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Flex align="center" gap={3} flexWrap="wrap">
          <Button leftIcon={<Icon as={MdArrowBack} />} variant="ghost" size="sm" onClick={goToList}>
            Back
          </Button>
          <Heading size="lg" color={headingColor}>
            {order.so_number || `SO-${id}`}
          </Heading>
          <Badge
            colorScheme={formatShippingOrderStatusColor(order.done)}
            variant="subtle"
            borderRadius="full"
            px={2.5}
            py={0.5}
            fontSize="xs"
            textTransform="none"
          >
            {formatShippingOrderStatusLabel(order.done)}
          </Badge>
        </Flex>
        <HStack spacing={2}>
          <Button
            leftIcon={<Icon as={MdEdit} />}
            colorScheme="red"
            onClick={() => history.push(`/admin/shipping-orders/edit/${order.id}`)}
          >
            Edit
          </Button>
          <Button leftIcon={<Icon as={MdDelete} />} colorScheme="warning" variant="outline" onClick={onDeleteOpen}>
            Delete
          </Button>
        </HStack>
      </Flex>

      <Card p={{ base: 4, md: 6 }} bg={cardBg} border="1px" borderColor={borderColor} mb={6}>
        <Heading size="sm" mb={4}>
          Shipping order details
        </Heading>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }} columnGap={6}>
          <DetailField label="SO Number">{prettyValue(order.so_number)}</DetailField>
          <DetailField label="Date Created">
            {prettyValue(formatShippingOrderDisplayDate(order.date_created || order.date_order))}
          </DetailField>
          <DetailField label="Status">{formatShippingOrderStatusLabel(order.done)}</DetailField>
          <DetailField label="Person in Charge">{prettyValue(order.pic_name)}</DetailField>
          <DetailField label="Client">{prettyValue(order.client)}</DetailField>
          <DetailField label="Client Code">{prettyValue(order.client_code)}</DetailField>
          <DetailField label="Vessel">{prettyValue(order.vessel_name)}</DetailField>
          <DetailField label="Destination type">
            {prettyValue(formatShippingOrderDestinationTypeLabel(order.destination_type))}
          </DetailField>
          <DetailField label="Destination">{prettyValue(formatShippingOrderDestinationDisplay(order))}</DetailField>
          <DetailField label="Country">{prettyValue(order.country_name)}</DetailField>
          <DetailField label="Next Action">
            {prettyValue(formatShippingOrderDisplayDate(order.next_action))}
          </DetailField>
          <DetailField label="SO Case Closed Date">
            {prettyValue(formatShippingOrderDisplayDate(order.so_delivery_date))}
          </DetailField>
          <DetailField label="ETA">{prettyValue(formatShippingOrderDisplayDate(order.eta_date))}</DetailField>
          <DetailField label="ETB">{prettyValue(formatShippingOrderDisplayDate(order.etb))}</DetailField>
          <DetailField label="ETD">{prettyValue(formatShippingOrderDisplayDate(order.etd))}</DetailField>
          <DetailField label="Quotation">{prettyValue(order.quotation)}</DetailField>
          <DetailField label="Delivery via service boat / launch">
            {isDeliveryViaServiceBoat(order.delivery_via_service_boat) ? "Yes" : "No"}
          </DetailField>
          <DetailField label="Service boat / launch paid by">
            {prettyValue(formatServiceBoatPaidByLabel(order.service_boat_paid_by))}
          </DetailField>
          <DetailField label="Cost confirmed to the client">
            {isCostConfirmedToClient(order.cost_confirmed_to_client) ? "Yes" : "No"}
          </DetailField>
          <DetailField label="Package link">
            {packageUrl ? (
              <Link href={packageUrl} isExternal color="blue.500">
                Open package
              </Link>
            ) : (
              "—"
            )}
          </DetailField>
          {order.done === "cancelled" && (
            <DetailField label="Cancel Reason" fullWidth>
              {prettyValue(order.cancel_text)}
            </DetailField>
          )}
          <DetailField label="Internal remark" fullWidth>
            {prettyValue(order.internal_remark)}
          </DetailField>
          <DetailField label="VSLS Agent details" fullWidth>
            {prettyValue(order.vsls_agent_dtls)}
          </DetailField>
          <DetailField label="Client case / Invoice Ref" fullWidth>
            {prettyValue(order.client_case_invoice_ref)}
          </DetailField>
          <DetailField label="Files" fullWidth>
            {renderFileList(attachments, "attachment", "No files")}
          </DetailField>
          <DetailField label="CIPL files" fullWidth>
            {renderFileList(ciplFiles, "cipl", "No CIPL files")}
          </DetailField>
        </Grid>
      </Card>

      {twoWay.clientUpdatedAt ? (
        <Flex align="center" gap={2} wrap="wrap" mb={4}>
          <Text fontSize="sm">
            Client last changed this order: {formatRemarkDateTime(twoWay.clientUpdatedAt)}
          </Text>
          {clientUpdateSeenNow ? (
            <Badge colorScheme="orange" borderRadius="full" px={2.5}>
              New client update
            </Badge>
          ) : twoWay.seenByNarviAt ? (
            <Badge colorScheme="green" borderRadius="full" px={2.5}>
              Seen {formatRemarkDateTime(twoWay.seenByNarviAt)}
            </Badge>
          ) : null}
        </Flex>
      ) : null}

      <ShippingOrderRemarksPanel
        twoWay={twoWay}
        viewer="admin"
        canWrite
        isSending={isSendingRemark}
        onSend={handleSendRemarkToClient}
      />
      <ShippingOrderChangesPanel changes={twoWay.changes} viewer="admin" />

      <Card p={{ base: 4, md: 6 }} bg={cardBg} border="1px" borderColor={borderColor}>
        <ShippingOrderStockList
          title="Stock items"
          variant="full"
          allowOpenInStockList
          stockList={order.stock_list}
          stockItemCount={order.stock_item_count}
        />
      </Card>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => {
          if (!isDeleting) onDeleteClose();
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete shipping order</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete {order.so_number || `SO-${order.id}`}? This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={onDeleteClose} isDisabled={isDeleting}>
                Cancel
              </Button>
              <Button colorScheme="red" ml={3} onClick={handleConfirmDelete} isLoading={isDeleting}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
