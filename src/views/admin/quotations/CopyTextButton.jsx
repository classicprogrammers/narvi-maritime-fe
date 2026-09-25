import React, { useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { extractNarviQuotationError, getNarviQuotationCopyText } from "../../../api/narviQuotation";
import { extractCopyText } from "./quotationUtils";

export default function CopyTextButton({ quotationId, size = "sm" }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [fallbackText, setFallbackText] = useState("");

  const copy = async () => {
    if (!quotationId) return;
    setLoading(true);
    try {
      const result = await getNarviQuotationCopyText(quotationId);
      const text = extractCopyText(result);
      if (!text) throw new Error("No copy text returned.");
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard", status: "success", duration: 2000, isClosable: true });
      } catch {
        setFallbackText(text);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Failed to copy quotation."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size={size} variant="outline" onClick={copy} isLoading={loading}>
        Copy Selected
      </Button>
      <Modal isOpen={Boolean(fallbackText)} onClose={() => setFallbackText("")} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Copy quotation text</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Textarea value={fallbackText} readOnly rows={14} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
