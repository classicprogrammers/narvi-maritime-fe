import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  useDisclosure,
} from "@chakra-ui/react";
import { MdPictureAsPdf, MdPrint } from "react-icons/md";
import { buildRateListPdf, getRateListPdfFilename } from "./rateListPdf";

/** Full-screen PDF preview (print / download) for a model built with `buildPdfModel`. */
export default function usePdfPreview() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const iframeRef = useRef(null);
  const blobUrlRef = useRef(null);
  const [model, setModel] = useState(null);
  const [url, setUrl] = useState(null);

  const revokeUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const openPdf = useCallback(
    async (nextModel) => {
      const doc = await buildRateListPdf(nextModel);
      revokeUrl();
      blobUrlRef.current = URL.createObjectURL(doc.output("blob"));
      setModel(nextModel);
      setUrl(blobUrlRef.current);
      onOpen();
    },
    [onOpen]
  );

  const handleClose = () => {
    revokeUrl();
    setUrl(null);
    onClose();
  };

  const handleDownload = async () => {
    const doc = await buildRateListPdf(model);
    doc.save(getRateListPdfFilename(model));
  };

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  useEffect(() => revokeUrl, []);

  const pdfPreviewModal = (
    <Modal isOpen={isOpen} onClose={handleClose} size="full" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent m={0} maxW="100vw" h="100vh" maxH="100vh" borderRadius={0} display="flex" flexDirection="column">
        <ModalHeader flexShrink={0}>
          {model?.title}
          {model?.scopeLabel ? ` — ${model.scopeLabel}` : ""}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0} flex="1" minH={0} overflow="hidden" display="flex" flexDirection="column">
          {url ? (
            <Box flex="1" minH={0} w="100%" display="flex">
              <iframe
                ref={iframeRef}
                title="PDF preview"
                src={url}
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
          <Button leftIcon={<Icon as={MdPrint} />} onClick={handlePrint} isDisabled={!url}>
            Print
          </Button>
          <Button colorScheme="blue" leftIcon={<Icon as={MdPictureAsPdf} />} onClick={handleDownload} isDisabled={!model}>
            Download
          </Button>
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  return { openPdf, pdfPreviewModal };
}
