import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { MdPictureAsPdf, MdPrint } from "react-icons/md";
import Card from "components/card/Card";
import narviLetterheadPrint from "../../../assets/letterHead/NarviLetterhead.jpeg";
import {
  buildTaxInvoicePdf,
  buildTaxInvoiceSnapshot,
  formatInvoiceMoney,
  getTaxInvoicePdfFilename,
} from "./invoicePdf";

const LINE_ITEM_COUNT = 8;

const GRID_COLS = ["18%", "32%", "18%", "16%", "16%"];
const INVOICE_LETTERHEAD_HEIGHT = "160pt";
const INVOICE_LETTERHEAD_LEFT_CROP = "32pt";

const EMPTY_LINE_ITEM = {
  description: "",
  amount: "",
  agentCost: "",
};

const cellBorder = "1px solid #000";
const thStyle = {
  border: cellBorder,
  padding: "4px 6px",
  fontSize: "11px",
  fontWeight: "700",
  verticalAlign: "middle",
  background: "#fff",
};
const tdStyle = {
  border: cellBorder,
  padding: "2px 4px",
  fontSize: "11px",
  verticalAlign: "top",
  background: "#fff",
};

function ColGroup() {
  return (
    <colgroup>
      {GRID_COLS.map((width) => (
        <col key={width} style={{ width }} />
      ))}
    </colgroup>
  );
}

function InvoiceField({ value, onChange, multiline = false, minH, textAlign, fontWeight }) {
  const common = {
    value: value ?? "",
    onChange,
    variant: "unstyled",
    w: "100%",
    fontSize: "11px",
    fontWeight,
    textAlign,
    px: 1,
    py: 0.5,
    minH: minH || (multiline ? "48px" : "22px"),
  };

  if (multiline) {
    return <Textarea {...common} resize="vertical" rows={2} />;
  }
  return <Input {...common} />;
}

function MetaPairRow({ leftLabel, leftValue, onLeftChange, rightLabel, rightValue, onRightChange, leftMultiline }) {
  return (
    <tr>
      <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: "nowrap" }}>{leftLabel}</td>
      <td style={tdStyle}>
        <InvoiceField value={leftValue} onChange={onLeftChange} multiline={leftMultiline} minH={leftMultiline ? "56px" : "22px"} />
      </td>
      <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: "nowrap" }}>{rightLabel}</td>
      <td style={tdStyle} colSpan={2}>
        <InvoiceField value={rightValue} onChange={onRightChange} />
      </td>
    </tr>
  );
}

export default function Invoice() {
  const toast = useToast();
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const pageBg = useColorModeValue("gray.50", "navy.900");
  const { isOpen: isPdfPreviewOpen, onOpen: onPdfPreviewOpen, onClose: onPdfPreviewClose } = useDisclosure();

  const pdfDocRef = useRef(null);
  const pdfPreviewBlobUrlRef = useRef(null);
  const pdfPreviewIframeRef = useRef(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfSnapshot, setPdfSnapshot] = useState(null);

  const [billTo, setBillTo] = useState("");
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [date, setDate] = useState("");
  const [pageNo, setPageNo] = useState("1 OF 1");
  const [taxInvoiceNumber, setTaxInvoiceNumber] = useState("");
  const [attention, setAttention] = useState("");
  const [yourRef, setYourRef] = useState("");
  const [jobCargoDescription, setJobCargoDescription] = useState("");
  const [jobNo, setJobNo] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState("USD");
  const [lineItems, setLineItems] = useState(
    Array.from({ length: LINE_ITEM_COUNT }, () => ({ ...EMPTY_LINE_ITEM }))
  );
  const [gstAmount, setGstAmount] = useState("");

  const totalAmount = useMemo(
    () =>
      lineItems.reduce((sum, item) => {
        const n = Number(String(item.amount ?? "").replace(/,/g, "").trim());
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [lineItems]
  );

  const totalAgentCost = useMemo(
    () =>
      lineItems.reduce((sum, item) => {
        const n = Number(String(item.agentCost ?? "").replace(/,/g, "").trim());
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [lineItems]
  );

  const grandTotal = useMemo(() => {
    const gst = Number(String(gstAmount ?? "").replace(/,/g, "").trim());
    return totalAmount + (Number.isFinite(gst) ? gst : 0);
  }, [gstAmount, totalAmount]);

  const formatMoney = formatInvoiceMoney;

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const getCurrentSnapshot = useCallback(
    () =>
      buildTaxInvoiceSnapshot({
        billTo,
        invoiceAddress,
        date,
        pageNo,
        taxInvoiceNumber,
        attention,
        yourRef,
        jobCargoDescription,
        jobNo,
        approvedBy,
        paymentTerms,
        invoiceCurrency,
        lineItems,
        gstAmount,
      }),
    [
      approvedBy,
      attention,
      billTo,
      date,
      gstAmount,
      invoiceAddress,
      invoiceCurrency,
      jobCargoDescription,
      jobNo,
      lineItems,
      pageNo,
      paymentTerms,
      taxInvoiceNumber,
      yourRef,
    ]
  );

  const handleClosePdfPreview = useCallback(() => {
    if (pdfPreviewBlobUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
      pdfPreviewBlobUrlRef.current = null;
    }
    setPdfPreviewUrl(null);
    pdfDocRef.current = null;
    setPdfSnapshot(null);
    onPdfPreviewClose();
  }, [onPdfPreviewClose]);

  const handleOpenPdfPreview = useCallback(async () => {
    setIsPdfLoading(true);
    try {
      const snapshot = getCurrentSnapshot();
      const doc = await buildTaxInvoicePdf(snapshot);
      pdfDocRef.current = doc;
      setPdfSnapshot(snapshot);

      if (pdfPreviewBlobUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
        pdfPreviewBlobUrlRef.current = null;
      }
      const url = doc.output("bloburl");
      pdfPreviewBlobUrlRef.current = url;
      setPdfPreviewUrl(url);
      onPdfPreviewOpen();
    } catch (error) {
      console.error("Failed to build tax invoice PDF:", error);
      toast({
        title: "PDF failed",
        description: "Could not generate invoice PDF.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsPdfLoading(false);
    }
  }, [getCurrentSnapshot, onPdfPreviewOpen, toast]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      const doc = pdfDocRef.current || (await buildTaxInvoicePdf(getCurrentSnapshot()));
      const snapshot = pdfSnapshot || getCurrentSnapshot();
      doc.save(getTaxInvoicePdfFilename(snapshot));
    } catch (error) {
      console.error("Failed to download tax invoice PDF:", error);
      toast({
        title: "Download failed",
        description: "Could not download invoice PDF.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [getCurrentSnapshot, pdfSnapshot, toast]);

  const handlePrintFromPdfPreview = useCallback(() => {
    const win = pdfPreviewIframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }, []);

  useEffect(
    () => () => {
      if (pdfPreviewBlobUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
      }
    },
    []
  );

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Card>
        <Flex mb="20px" align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <Text color={textColor} fontSize="2xl" fontWeight="700">
            Invoice
          </Text>
          <HStack spacing={3}>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={MdPictureAsPdf} />}
              onClick={handleOpenPdfPreview}
              isLoading={isPdfLoading}
              loadingText="Generating..."
            >
              PDF
            </Button>
          </HStack>
        </Flex>

        <Box bg={pageBg} borderRadius="12px" p={{ base: 3, md: 6 }} overflowX="auto">
          <Box
            maxW="920px"
            minW="760px"
            mx="auto"
            bg="white"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.300"
            position="relative"
            overflow="hidden"
          >
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              h={INVOICE_LETTERHEAD_HEIGHT}
              overflow="hidden"
              pointerEvents="none"
              zIndex={0}
            >
              <Box
                h="842pt"
                w={`calc(100% + ${INVOICE_LETTERHEAD_LEFT_CROP})`}
                ml={`-${INVOICE_LETTERHEAD_LEFT_CROP}`}
                backgroundImage={`url(${narviLetterheadPrint})`}
                backgroundSize="100% 100%"
                backgroundRepeat="no-repeat"
                backgroundPosition="top left"
              />
            </Box>

            <Box pt={INVOICE_LETTERHEAD_HEIGHT} px="30pt" pb="24pt" position="relative" zIndex={1}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <ColGroup />
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, verticalAlign: "top" }} colSpan={2}>
                    <Text fontSize="11px" fontWeight="700" mb={1}>
                      BILL TO :
                    </Text>
                    <InvoiceField value={billTo} onChange={(e) => setBillTo(e.target.value)} multiline minH="36px" />
                    <Text fontSize="11px" fontWeight="700" mt={2} mb={1}>
                      INVOICE ADDRESS
                    </Text>
                    <InvoiceField value={invoiceAddress} onChange={(e) => setInvoiceAddress(e.target.value)} multiline minH="56px" />
                  </td>
                  <td style={{ ...tdStyle, verticalAlign: "top" }} colSpan={3}>
                    <Flex direction="column" gap={2}>
                      <Flex align="center" gap={2}>
                        <Text fontSize="11px" fontWeight="700" whiteSpace="nowrap">
                          DATE :
                        </Text>
                        <InvoiceField value={date} onChange={(e) => setDate(e.target.value)} />
                      </Flex>
                      <Flex align="center" gap={2}>
                        <Text fontSize="11px" fontWeight="700" whiteSpace="nowrap">
                          PAGE :
                        </Text>
                        <InvoiceField value={pageNo} onChange={(e) => setPageNo(e.target.value)} />
                      </Flex>
                    </Flex>
                  </td>
                </tr>

                <tr>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      verticalAlign: "middle",
                      height: "48px",
                      padding: "8px 6px",
                    }}
                    colSpan={5}
                  >
                    <Flex align="center" justify="center" minH="32px">
                      <Text fontSize="18px" fontWeight="700" letterSpacing="0.4px" lineHeight="1.2">
                        TAX INVOICE NUMBER :
                      </Text>
                    </Flex>
                  </td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle", padding: "6px" }} colSpan={5}>
                    <Box maxW="360px" mx="auto">
                      <InvoiceField
                        value={taxInvoiceNumber}
                        onChange={(e) => setTaxInvoiceNumber(e.target.value)}
                        textAlign="center"
                        fontWeight="700"
                      />
                    </Box>
                  </td>
                </tr>

                <MetaPairRow
                  leftLabel="ATTENTION :"
                  leftValue={attention}
                  onLeftChange={(e) => setAttention(e.target.value)}
                  rightLabel="JOB NO :"
                  rightValue={jobNo}
                  onRightChange={(e) => setJobNo(e.target.value)}
                />
                <MetaPairRow
                  leftLabel="YOUR REF :"
                  leftValue={yourRef}
                  onLeftChange={(e) => setYourRef(e.target.value)}
                  rightLabel="APPROVED BY :"
                  rightValue={approvedBy}
                  onRightChange={(e) => setApprovedBy(e.target.value)}
                />
                <MetaPairRow
                  leftLabel="JOB/CARGO DESCRIPTION :"
                  leftValue={jobCargoDescription}
                  onLeftChange={(e) => setJobCargoDescription(e.target.value)}
                  rightLabel="PAYMENT TERMS :"
                  rightValue={paymentTerms}
                  onRightChange={(e) => setPaymentTerms(e.target.value)}
                  leftMultiline
                />

                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }} colSpan={2}>
                    DESCRIPTION
                  </th>
                  <th style={{ ...thStyle, textAlign: "center" }}>
                    INVOICE CURRENCY:
                    <Box mt={1}>
                      <InvoiceField
                        value={invoiceCurrency}
                        onChange={(e) => setInvoiceCurrency(e.target.value)}
                        textAlign="center"
                        fontWeight="700"
                      />
                    </Box>
                  </th>
                  <th style={{ ...thStyle, textAlign: "center" }}>AMOUNT</th>
                  <th style={{ ...thStyle, textAlign: "center", color: "#e53e3e" }}>AGENT COST</th>
                </tr>

                {lineItems.map((item, index) => (
                  <tr key={`line-${index}`}>
                    <td style={{ ...tdStyle, minHeight: "28px" }} colSpan={2}>
                      <InvoiceField
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        multiline
                        minH="28px"
                      />
                    </td>
                    <td style={tdStyle} />
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <InvoiceField
                        value={item.amount}
                        onChange={(e) => updateLineItem(index, "amount", e.target.value)}
                        textAlign="right"
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <InvoiceField
                        value={item.agentCost}
                        onChange={(e) => updateLineItem(index, "agentCost", e.target.value)}
                        textAlign="right"
                      />
                    </td>
                  </tr>
                ))}

                <tr>
                  <td style={{ ...tdStyle, verticalAlign: "top" }} colSpan={2} rowSpan={3}>
                    <Text fontSize="11px" fontWeight="700" fontStyle="italic" mb={1}>
                      ***Bank Details :
                    </Text>
                    <Text fontSize="11px" lineHeight="1.35" whiteSpace="pre-line">
                      {`DBS Bank Ltd
DBS ASIA Central MBFC Tower 3
12 Marina Boulevard
018982 Singapore`}
                    </Text>
                  </td>
                  <td style={{ ...tdStyle, verticalAlign: "top" }} rowSpan={3}>
                    <Text fontSize="11px" lineHeight="1.45" whiteSpace="pre-line">
                      {`In the name of : Narvi Maritime Pte Ltd
GST Reg. No. 202008258Z
Account number : 0339059927(USD)
SWIFT Code/BIG : DBSSSGSG`}
                    </Text>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>TOTAL</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{formatMoney(totalAmount)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>GST AMOUNT</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <InvoiceField
                      value={gstAmount}
                      onChange={(e) => setGstAmount(e.target.value)}
                      textAlign="right"
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>
                    GRAND TOTAL {invoiceCurrency || "USD"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{formatMoney(grandTotal)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, borderTop: "none" }} colSpan={3} />
                  <td style={{ ...tdStyle, borderTop: "none" }} />
                  <td style={{ ...tdStyle, borderTop: "none", textAlign: "right", fontWeight: 700 }}>
                    {formatMoney(totalAgentCost)}
                  </td>
                </tr>
              </tbody>
            </table>

            <Box mt={3} textAlign="center">
              <Text fontSize="12px" fontWeight="600">
                Invoice amount to be paid in full without deduction of any bank fees or charges
              </Text>
            </Box>

            <Box mt={4}>
              <Text fontSize="11px" lineHeight="1.45" mb={1}>
                Discrepancies in this invoice should be lodged within 14 days from the date of invoice, otherwise the invoice amount will be treated as true &amp; correct.
              </Text>
              <Text fontSize="11px" lineHeight="1.45" mb={1}>
                Interests of 3% per month will be levelled on all accounts beyond payment terms in case of no further agreement made.
              </Text>
              <Text fontSize="11px" lineHeight="1.45" mb={1}>
                This is a computer generated Invoice - No signature is required
              </Text>
              <Text fontSize="11px" lineHeight="1.45">
                All cheques should be crossed and made payable to Narvi Maritime Pte Ltd
              </Text>
            </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      <Modal isOpen={isPdfPreviewOpen} onClose={handleClosePdfPreview} size="full" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent m={0} maxW="100vw" h="100vh" maxH="100vh" borderRadius={0} display="flex" flexDirection="column">
          <ModalHeader flexShrink={0}>
            Tax Invoice{pdfSnapshot?.taxInvoiceNumber ? ` — ${pdfSnapshot.taxInvoiceNumber}` : ""}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} flex="1" minH={0} overflow="hidden" display="flex" flexDirection="column">
            {pdfPreviewUrl ? (
              <Box flex="1" minH={0} w="100%" display="flex">
                <iframe
                  ref={pdfPreviewIframeRef}
                  title="Tax invoice PDF preview"
                  src={pdfPreviewUrl}
                  style={{ border: "none", width: "100%", flex: 1, minHeight: 0 }}
                />
              </Box>
            ) : (
              <Flex align="center" justify="center" flex="1" minH={0}>
                <Spinner size="lg" />
              </Flex>
            )}
          </ModalBody>
          <ModalFooter gap={2} flexWrap="wrap" flexShrink={0}>
            <Button leftIcon={<Icon as={MdPrint} />} onClick={handlePrintFromPdfPreview} isDisabled={!pdfPreviewUrl}>
              Print
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={MdPictureAsPdf} />}
              onClick={handleDownloadPdf}
              isDisabled={!pdfPreviewUrl}
            >
              Download
            </Button>
            <Button variant="ghost" onClick={handleClosePdfPreview}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
