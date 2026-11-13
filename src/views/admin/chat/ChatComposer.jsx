import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Image,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdAttachFile, MdClose, MdInsertDriveFile, MdReply, MdSend } from "react-icons/md";
import {
  CHAT_MAX_BODY_LENGTH,
  formatFileSize,
  readDraftBody,
  replyPreview,
  validateOutgoing,
  writeDraftBody,
} from "utils/chat";

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });

const ChatComposer = ({ onSend, replyTo = null, onCancelReply }) => {
  const toast = useToast();
  const [body, setBody] = useState(readDraftBody);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const barBg = useColorModeValue("white", "navy.800");
  const barBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputBg = useColorModeValue("gray.100", "navy.700");
  const inputFocusBg = useColorModeValue("gray.200", "navy.600");
  const fileNameColor = useColorModeValue("gray.800", "gray.50");
  const inputColor = useColorModeValue("gray.800", "gray.50");
  const placeholderColor = useColorModeValue("gray.600", "gray.300");
  const chipBg = useColorModeValue("gray.50", "navy.700");
  const chipBorder = useColorModeValue("gray.300", "whiteAlpha.300");

  useEffect(() => {
    if (replyTo && textareaRef.current) textareaRef.current.focus();
  }, [replyTo]);

  // Keep the unsent text so a refresh or navigating away doesn't lose it
  useEffect(() => {
    writeDraftBody(body);
  }, [body]);

  // Grow with the text (like WhatsApp) up to the max height, then scroll inside
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl("");
    return undefined;
  }, [file]);

  const pickFile = (picked) => {
    if (!picked) return;
    const error = validateOutgoing({ file: picked });
    if (error) {
      toast({ title: error, status: "warning", duration: 4000, isClosable: true });
      return;
    }
    setFile(picked);
  };

  const handlePaste = (e) => {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    e.preventDefault();
    const pasted = item.getAsFile();
    if (pasted) {
      const ext = (pasted.type.split("/")[1] || "png").replace("jpeg", "jpg");
      pickFile(new File([pasted], `screenshot-${Date.now()}.${ext}`, { type: pasted.type }));
    }
  };

  const submit = async () => {
    if (sending) return;
    const error = validateOutgoing({ body, file });
    if (error) {
      toast({ title: error, status: "warning", duration: 4000, isClosable: true });
      return;
    }
    setSending(true);
    try {
      const payload = { body: body.trim() };
      if (file) {
        payload.attachment = {
          filename: file.name,
          mimetype: file.type || "application/octet-stream",
          datas: await readAsDataUrl(file),
        };
      }
      await onSend(payload);
      setBody("");
      setFile(null);
      textareaRef.current?.focus();
    } catch (err) {
      toast({
        title: "Message not sent",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && replyTo) onCancelReply?.();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Box bg={barBg} borderTop="1px solid" borderColor={barBorder} px={{ base: 3, md: 8 }} py="12px">
      <Box maxW="760px" mx="auto">
      {replyTo && (
        <Flex
          align="center"
          gap={3}
          bg={chipBg}
          border="1px solid"
          borderColor={chipBorder}
          borderLeft="4px solid"
          borderLeftColor="brand.500"
          borderRadius="lg"
          px={3}
          py={2}
          mb={2}
        >
          <Icon as={MdReply} color="brand.500" />
          <Box flex="1" minW={0}>
            <Text fontSize="xs" fontWeight="700" color="brand.600" noOfLines={1}>
              Replying to {replyTo.is_mine ? "yourself" : replyTo.sender?.name}
            </Text>
            <Text fontSize="sm" color={fileNameColor} noOfLines={1}>
              {replyPreview({ body: replyTo.body, attachment_name: replyTo.attachment?.name }).text}
            </Text>
          </Box>
          <IconButton aria-label="Cancel reply" icon={<MdClose />} size="sm" variant="ghost" onClick={onCancelReply} />
        </Flex>
      )}
      {file && (
        <Flex
          align="center"
          gap={3}
          bg={chipBg}
          border="1px solid"
          borderColor={chipBorder}
          borderRadius="lg"
          p={2}
          mb={3}
          maxW="100%"
          w="fit-content"
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={file.name}
              boxSize="64px"
              objectFit="cover"
              borderRadius="md"
              border="1px solid"
              borderColor={chipBorder}
              bg="white"
            />
          ) : (
            <Icon as={MdInsertDriveFile} boxSize={8} color="brand.600" />
          )}
          <Box minW={0}>
            <Text fontSize="sm" fontWeight="600" color={fileNameColor} noOfLines={1} maxW="300px">
              {file.name}
            </Text>
            <Text fontSize="xs" color={placeholderColor}>
              {formatFileSize(file.size)}
            </Text>
          </Box>
          <IconButton
            aria-label="Remove attachment"
            icon={<MdClose />}
            size="sm"
            variant="ghost"
            color={fileNameColor}
            _hover={{ bg: "red.50", color: "red.600" }}
            onClick={() => setFile(null)}
          />
        </Flex>
      )}
      <Flex
        align="flex-end"
        gap={2}
        bg={inputBg}
        borderRadius="26px"
        boxShadow="inset 0 0 0 1px rgba(0,0,0,0.06)"
        transition="background-color 0.15s ease"
        _focusWithin={{ bg: inputFocusBg }}
        pl="6px"
        pr="6px"
        py="6px"
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <IconButton
          aria-label="Attach file"
          icon={<MdAttachFile size={22} />}
          variant="ghost"
          color={fileNameColor}
          borderRadius="full"
          onClick={() => fileInputRef.current?.click()}
        />
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message (paste screenshots here)"
          rows={1}
          minH="40px"
          maxH="160px"
          resize="none"
          overflowY="auto"
          variant="unstyled"
          outline="none"
          border="none"
          boxShadow="none"
          _focus={{ outline: "none", boxShadow: "none", border: "none" }}
          sx={{ "&:focus, &:focus-visible": { outline: "none !important", boxShadow: "none !important" } }}
          color={inputColor}
          _placeholder={{ color: placeholderColor }}
          py="9px"
          px="4px"
          fontSize="sm"
          maxLength={CHAT_MAX_BODY_LENGTH}
        />
        <IconButton
          aria-label="Send message"
          icon={<MdSend size={20} />}
          colorScheme="blue"
          borderRadius="full"
          isDisabled={!body.trim() && !file}
          isLoading={sending}
          onClick={submit}
        />
      </Flex>
      </Box>
    </Box>
  );
};

export default ChatComposer;
