import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    Flex,
    Text,
    IconButton,
    Icon,
    Spinner,
    Center,
    Box,
    HStack,
    useToast,
} from "@chakra-ui/react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import {
    getStockAttachmentLabel,
    isPreviewableInBrowser,
    resolveStockAttachmentPreviewUrl,
} from "../../utils/stockAttachmentPreview";

const getAttachmentCacheKey = (att, idx) => {
    if (att?.id != null && att.id !== "") return String(att.id);
    return `idx-${idx}-${getStockAttachmentLabel(att)}`;
};

const revokeCachedPreview = (entry) => {
    if (entry?.shouldRevoke && entry.fileUrl) {
        URL.revokeObjectURL(entry.fileUrl);
    }
};

export default function StockAttachmentsGalleryModal({
    isOpen,
    onClose,
    attachments = [],
    stockItemId = null,
    initialIndex = 0,
    resolvePreviewUrl,
}) {
    const toast = useToast();
    const list = useMemo(
        () => (Array.isArray(attachments) ? attachments.filter(Boolean) : []),
        [attachments]
    );
    const listSignature = useMemo(
        () => list.map((att, idx) => getAttachmentCacheKey(att, idx)).join("|"),
        [list]
    );

    const [index, setIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const cacheRef = useRef(new Map());
    const loadGenerationRef = useRef(0);

    const resolvePreview = resolvePreviewUrl || resolveStockAttachmentPreviewUrl;

    const clearCache = useCallback(() => {
        cacheRef.current.forEach(revokeCachedPreview);
        cacheRef.current.clear();
    }, []);

    const loadIndex = useCallback(
        async (idx) => {
            const att = list[idx];
            if (!att) return;

            const cacheKey = getAttachmentCacheKey(att, idx);
            const cached = cacheRef.current.get(cacheKey);
            if (cached) {
                setPreview(cached);
                setLoading(false);
                return;
            }

            const generation = loadGenerationRef.current + 1;
            loadGenerationRef.current = generation;
            setLoading(true);
            setPreview(null);

            try {
                const resolved = await resolvePreview(att, stockItemId);
                if (generation !== loadGenerationRef.current) {
                    revokeCachedPreview(resolved);
                    return;
                }
                cacheRef.current.set(cacheKey, resolved);
                setPreview(resolved);
            } catch (error) {
                if (generation !== loadGenerationRef.current) return;
                console.error("Failed to load attachment preview:", error);
                toast({
                    title: "Error",
                    description: error.message || "Failed to load preview",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                if (generation === loadGenerationRef.current) {
                    setLoading(false);
                }
            }
        },
        [list, stockItemId, resolvePreview, toast]
    );

    useEffect(() => {
        if (!isOpen) {
            loadGenerationRef.current += 1;
            clearCache();
            setPreview(null);
            setLoading(false);
            setIndex(0);
            return;
        }
        if (list.length === 0) return;
        const safeIndex = Math.min(Math.max(0, initialIndex), list.length - 1);
        setIndex(safeIndex);
    }, [isOpen, initialIndex, list.length, listSignature, clearCache]);

    useEffect(() => {
        if (!isOpen || list.length === 0) return;
        loadIndex(index);
    }, [isOpen, index, listSignature, loadIndex]);

    const handleClose = () => {
        loadGenerationRef.current += 1;
        clearCache();
        setPreview(null);
        onClose();
    };

    const goPrev = () => setIndex((prev) => Math.max(0, prev - 1));
    const goNext = () => setIndex((prev) => Math.min(list.length - 1, prev + 1));

    const currentLabel = preview?.filename || getStockAttachmentLabel(list[index]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="full" scrollBehavior="inside">
            <ModalOverlay bg="rgba(0, 0, 0, 0.75)" />
            <ModalContent m={0} maxW="100vw" maxH="100vh" bg="gray.900">
                <ModalHeader bg="gray.800" color="white" borderBottom="1px solid" borderColor="gray.700" py={3}>
                    <Flex align="center" justify="space-between" gap={3} pr={10}>
                        <Box minW={0} flex={1}>
                            <Text fontSize="md" fontWeight="600" isTruncated title={currentLabel}>
                                {currentLabel}
                            </Text>
                            {list.length > 1 && (
                                <Text fontSize="xs" color="gray.300" mt={0.5}>
                                    {index + 1} of {list.length}
                                </Text>
                            )}
                        </Box>
                        {list.length > 1 && (
                            <HStack spacing={1} flexShrink={0}>
                                <IconButton
                                    aria-label="Previous attachment"
                                    icon={<Icon as={MdChevronLeft} boxSize={6} />}
                                    size="sm"
                                    variant="ghost"
                                    color="white"
                                    isDisabled={index <= 0}
                                    onClick={goPrev}
                                />
                                <IconButton
                                    aria-label="Next attachment"
                                    icon={<Icon as={MdChevronRight} boxSize={6} />}
                                    size="sm"
                                    variant="ghost"
                                    color="white"
                                    isDisabled={index >= list.length - 1}
                                    onClick={goNext}
                                />
                            </HStack>
                        )}
                    </Flex>
                </ModalHeader>
                <ModalCloseButton color="white" />
                <ModalBody p={0} bg="gray.900" display="flex" flexDirection="column" minH="0">
                    <Flex flex={1} align="center" justify="center" minH="calc(100vh - 140px)" position="relative">
                        {list.length > 1 && (
                            <>
                                <IconButton
                                    aria-label="Previous attachment"
                                    icon={<Icon as={MdChevronLeft} boxSize={8} />}
                                    position="absolute"
                                    left={4}
                                    top="50%"
                                    transform="translateY(-50%)"
                                    zIndex={2}
                                    size="lg"
                                    borderRadius="full"
                                    bg="blackAlpha.600"
                                    color="white"
                                    _hover={{ bg: "blackAlpha.700" }}
                                    isDisabled={index <= 0}
                                    onClick={goPrev}
                                />
                                <IconButton
                                    aria-label="Next attachment"
                                    icon={<Icon as={MdChevronRight} boxSize={8} />}
                                    position="absolute"
                                    right={4}
                                    top="50%"
                                    transform="translateY(-50%)"
                                    zIndex={2}
                                    size="lg"
                                    borderRadius="full"
                                    bg="blackAlpha.600"
                                    color="white"
                                    _hover={{ bg: "blackAlpha.700" }}
                                    isDisabled={index >= list.length - 1}
                                    onClick={goNext}
                                />
                            </>
                        )}
                        {loading ? (
                            <Center w="100%" h="100%">
                                <Spinner size="xl" color="white" />
                            </Center>
                        ) : preview ? (
                            isPreviewableInBrowser(preview.mimeType) ? (
                                preview.mimeType.startsWith("image/") ? (
                                    <Box p={6} w="100%" h="100%" display="flex" alignItems="center" justifyContent="center">
                                        <img
                                            src={preview.fileUrl}
                                            alt={preview.filename}
                                            style={{
                                                maxWidth: "100%",
                                                maxHeight: "calc(100vh - 160px)",
                                                objectFit: "contain",
                                            }}
                                        />
                                    </Box>
                                ) : (
                                    <Box w="100%" h="calc(100vh - 140px)" px={list.length > 1 ? 16 : 4}>
                                        <iframe
                                            src={preview.fileUrl}
                                            title={preview.filename}
                                            style={{ width: "100%", height: "100%", border: "none" }}
                                        />
                                    </Box>
                                )
                            ) : (
                                <Center flexDirection="column" gap={3} px={6} textAlign="center">
                                    <Text color="white">Preview is not available for this file type.</Text>
                                    <Button
                                        as="a"
                                        href={preview.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        colorScheme="blue"
                                        size="sm"
                                    >
                                        Open file
                                    </Button>
                                </Center>
                            )
                        ) : (
                            <Text color="gray.300">No preview available.</Text>
                        )}
                    </Flex>
                </ModalBody>
                <ModalFooter bg="gray.800" borderTop="1px solid" borderColor="gray.700">
                    <Button variant="ghost" color="white" onClick={handleClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
