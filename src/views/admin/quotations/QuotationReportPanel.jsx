import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { MdContentCopy, MdPictureAsPdf, MdPrint } from "react-icons/md";
import {
  buildQuotationReportHtml,
  buildQuotationReportModel,
  buildQuotationReportPdf,
  buildQuotationReportPlainText,
  copyQuotationReportToClipboard,
  DEFAULT_QUOTATION_REPORT_TERMS,
  getQuotationReportPdfFilename,
} from "./quotationReport";

export default function QuotationReportPanel({
  quotationId = "",
  quotationName = "",
  clientName = "",
  vesselName = "",
  headerCurrencyName = "USD",
  lines = [],
  disabled = false,
}) {
  const toast = useToast();
  const pdfPreviewIframeRef = useRef(null);
  const pdfPreviewBlobUrlRef = useRef(null);
  const { isOpen: isPdfPreviewOpen, onOpen: onPdfPreviewOpen, onClose: onPdfPreviewClose } =
    useDisclosure();

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPdfPreviewLoading, setIsPdfPreviewLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const instructionBg = useColorModeValue("orange.200", "orange.700");
  const instructionColor = useColorModeValue("orange.900", "orange.50");
  const previewBg = useColorModeValue("gray.100", "gray.700");
  const previewBorder = useColorModeValue("gray.300", "gray.500");
  const metaLabelColor = useColorModeValue("gray.700", "gray.200");

  const reportModel = useMemo(
    () =>
      buildQuotationReportModel({
        quotationId,
        quotationName,
        clientName,
        vesselName,
        headerCurrencyName,
        lines,
        terms: DEFAULT_QUOTATION_REPORT_TERMS,
      }),
    [quotationId, quotationName, clientName, vesselName, headerCurrencyName, lines]
  );

  const reportHtml = useMemo(() => buildQuotationReportHtml(reportModel), [reportModel]);
  const reportPlainText = useMemo(
    () => buildQuotationReportPlainText(reportModel),
    [reportModel]
  );

  const handleCopyReport = useCallback(async () => {
    setIsCopying(true);
    try {
      await copyQuotationReportToClipboard(reportHtml, reportPlainText);
      toast({
        title: "Copied",
        description:
          "Quotation copied to clipboard. Paste into e-mail directly (with table formatting) or use Paste Special > Plain text for no formatting.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Failed to copy quotation report:", error);
      toast({
        title: "Copy failed",
        description: "Could not copy quotation to clipboard.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsCopying(false);
    }
  }, [reportHtml, reportPlainText, toast]);

  const handleCopyPlainText = useCallback(async () => {
    setIsCopying(true);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportPlainText);
      } else {
        await copyQuotationReportToClipboard("", reportPlainText);
      }
      toast({
        title: "Plain text copied",
        description: "Paste into e-mail as plain text (no table formatting).",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Failed to copy plain text:", error);
      toast({
        title: "Copy failed",
        description: "Could not copy plain text to clipboard.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsCopying(false);
    }
  }, [reportPlainText, toast]);

  const handleClosePdfPreview = useCallback(() => {
    if (pdfPreviewBlobUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
      pdfPreviewBlobUrlRef.current = null;
    }
    setPdfPreviewUrl(null);
    onPdfPreviewClose();
  }, [onPdfPreviewClose]);

  const handleCreatePdf = useCallback(async () => {
    setIsPdfPreviewLoading(true);
    try {
      const doc = await buildQuotationReportPdf(reportModel);
      const blob = doc.output("blob");
      if (pdfPreviewBlobUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
        pdfPreviewBlobUrlRef.current = null;
      }
      const url = URL.createObjectURL(blob);
      pdfPreviewBlobUrlRef.current = url;
      setPdfPreviewUrl(url);
      onPdfPreviewOpen();
    } catch (error) {
      console.error("Failed to build quotation PDF:", error);
      toast({
        title: "PDF failed",
        description: "Could not generate quotation PDF.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsPdfPreviewLoading(false);
    }
  }, [onPdfPreviewOpen, reportModel, toast]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      const doc = await buildQuotationReportPdf(reportModel);
      doc.save(getQuotationReportPdfFilename(reportModel));
    } catch (error) {
      console.error("Failed to download quotation PDF:", error);
      toast({
        title: "Download failed",
        description: "Could not download quotation PDF.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [reportModel, toast]);

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

  const hasReportLines = reportModel.rows.length > 0;

  return (
    <>
      <Box w="100%">
        <Box
          bg={instructionBg}
          color={instructionColor}
          px={4}
          py={3}
          borderRadius="md"
          mb={4}
          fontSize="sm"
          fontWeight="600"
        >
          Mark area and Copy - Paste into e-mail either directly (with table formatting) or right
          click and select Plain text (=no formatting)
        </Box>

        <Flex
          direction={{ base: "column", md: "row" }}
          gap={3}
          mb={4}
          align={{ base: "stretch", md: "center" }}
          flexWrap="wrap"
        >
          <Button
            colorScheme="blue"
            leftIcon={<Icon as={MdPictureAsPdf} />}
            onClick={handleCreatePdf}
            isLoading={isPdfPreviewLoading}
            loadingText="Creating PDF..."
            isDisabled={disabled || !hasReportLines}
          >
            Create PDF
          </Button>
          <HStack spacing={2} flexWrap="wrap">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={MdContentCopy} />}
              onClick={handleCopyReport}
              isLoading={isCopying}
              isDisabled={disabled || !hasReportLines}
            >
              Copy table
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyPlainText}
              isLoading={isCopying}
              isDisabled={disabled || !hasReportLines}
            >
              Copy plain text
            </Button>
          </HStack>
        </Flex>

        {!hasReportLines ? (
          <Text fontSize="sm" color={metaLabelColor} mb={4}>
            Add quotation lines on the Quotation tab to generate a report.
          </Text>
        ) : null}

        <Box
          bg={previewBg}
          borderWidth="1px"
          borderColor={previewBorder}
          borderRadius="md"
          p={{ base: 3, md: 5 }}
          overflowX="auto"
          userSelect="text"
        >
          <VStack align="stretch" spacing={3} minW="640px">
            {[
              ["Client", reportModel.clientName],
              ["Vessel", reportModel.vesselName],
            ].map(([label, value]) => (
              <Box key={label}>
                <Text fontSize="sm" fontWeight="700" color={metaLabelColor}>
                  {label}
                </Text>
                <Text fontSize="sm">{value || "—"}</Text>
              </Box>
            ))}

            <Text fontSize="sm" fontWeight="700" pt={2}>
              Quotation:
            </Text>

            <Box as="table" w="100%" sx={{ borderCollapse: "collapse" }}>
              <Box as="tbody">
                {reportModel.rows.map((row, index) => (
                  <Box as="tr" key={`${row.rateName}-${index}`}>
                    <Box as="td" border="1px solid" borderColor={previewBorder} p={2} fontSize="sm">
                      {row.rateName}
                    </Box>
                    <Box
                      as="td"
                      border="1px solid"
                      borderColor={previewBorder}
                      p={2}
                      fontSize="sm"
                      textAlign="center"
                      whiteSpace="nowrap"
                    >
                      {row.currency}
                    </Box>
                    <Box
                      as="td"
                      border="1px solid"
                      borderColor={previewBorder}
                      p={2}
                      fontSize="sm"
                      textAlign="right"
                      whiteSpace="nowrap"
                    >
                      {row.amount}
                    </Box>
                    <Box as="td" border="1px solid" borderColor={previewBorder} p={2} fontSize="sm">
                      {row.remark}
                    </Box>
                  </Box>
                ))}
                <Box as="tr">
                  <Box
                    as="td"
                    border="1px solid"
                    borderColor={previewBorder}
                    p={2}
                    fontSize="sm"
                    fontWeight="700"
                  >
                    Quotation total
                  </Box>
                  <Box
                    as="td"
                    border="1px solid"
                    borderColor={previewBorder}
                    p={2}
                    fontSize="sm"
                    fontWeight="700"
                    textAlign="center"
                  >
                    {reportModel.totalCurrency}
                  </Box>
                  <Box
                    as="td"
                    border="1px solid"
                    borderColor={previewBorder}
                    p={2}
                    fontSize="sm"
                    fontWeight="700"
                    textAlign="right"
                  >
                    {reportModel.total}
                  </Box>
                  <Box as="td" border="1px solid" borderColor={previewBorder} p={2} />
                </Box>
              </Box>
            </Box>

            <VStack align="stretch" spacing={2} pt={2}>
              {reportModel.terms.map((term) => (
                <Text key={term} fontSize="sm">
                  {term}
                </Text>
              ))}
            </VStack>
          </VStack>
        </Box>
      </Box>

      <Modal isOpen={isPdfPreviewOpen} onClose={handleClosePdfPreview} size="full" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent m={4} maxH="calc(100vh - 2rem)">
          <ModalHeader>Quotation PDF</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} display="flex" flexDirection="column" flex="1" minH={0}>
            {isPdfPreviewLoading ? (
              <Flex align="center" justify="center" minH="60vh">
                <Spinner size="lg" />
              </Flex>
            ) : pdfPreviewUrl ? (
              <iframe
                ref={pdfPreviewIframeRef}
                title="Quotation PDF preview"
                src={pdfPreviewUrl}
                style={{ border: 0, width: "100%", minHeight: "70vh", flex: 1 }}
              />
            ) : null}
          </ModalBody>
          <ModalFooter gap={2} flexWrap="wrap">
            <Button variant="ghost" onClick={handleClosePdfPreview}>
              Close
            </Button>
            <Button variant="outline" onClick={handleDownloadPdf} isDisabled={!pdfPreviewUrl}>
              Download
            </Button>
            <Button
              leftIcon={<Icon as={MdPrint} />}
              colorScheme="blue"
              onClick={handlePrintFromPdfPreview}
              isDisabled={!pdfPreviewUrl}
            >
              Print
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
