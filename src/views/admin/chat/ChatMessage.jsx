import React, { useRef, useState } from "react";
import { Avatar, Box, Flex, Icon, IconButton, Image, Link, Text, useColorModeValue } from "@chakra-ui/react";
import { MdInsertDriveFile, MdFileDownload, MdReply } from "react-icons/md";
import { getCurrentStoredToken } from "utils/authStorage";
import {
  buildAttachmentUrl,
  formatChatTime,
  formatFileSize,
  isImageAttachment,
  replyPreview,
} from "utils/chat";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE_URL;
const AVATAR = "32px";

const SWIPE_TRIGGER_PX = 60;
const SWIPE_MAX_PX = 90;

const ChatMessage = ({ message, showSender, onPreview, onReply, onJumpTo }) => {
  const mine = message.is_mine;
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef(null);
  const quoteBg = useColorModeValue("blackAlpha.50", "whiteAlpha.100");
  const quoteBorder = useColorModeValue("brand.500", "blue.200");
  const otherBg = useColorModeValue("white", "navy.700");
  const otherText = useColorModeValue("gray.800", "gray.50");
  const otherBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const senderColor = useColorModeValue("brand.600", "blue.200");
  const otherMeta = useColorModeValue("gray.600", "gray.300");
  const fileBg = useColorModeValue("blackAlpha.50", "whiteAlpha.100");

  const { attachment } = message;
  const token = getCurrentStoredToken();
  const fileUrl = attachment ? buildAttachmentUrl(BASE_URL, attachment.download_url, token) : "";
  const downloadUrl = attachment
    ? buildAttachmentUrl(BASE_URL, attachment.download_url, token, { download: true })
    : "";
  const isImage = isImageAttachment(attachment);
  const metaColor = mine ? "whiteAlpha.900" : otherMeta;
  // reply_to is null both for "not a reply" and "original deleted"; backend gives no flag, so only quote when present
  const quote = message.reply_to ? replyPreview(message.reply_to) : null;

  // Swipe right (touch or mouse drag) past the trigger distance to reply
  const onPointerDown = (e) => {
    if (e.target.closest("a,button,img,textarea")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, active: false };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null;
        return;
      }
      if (dx > 8) d.active = true;
      else return;
    }
    setDragX(Math.max(0, Math.min(dx, SWIPE_MAX_PX)));
  };
  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && d.active && dragX >= SWIPE_TRIGGER_PX) onReply?.(message);
    setDragX(0);
  };

  return (
    <Flex
      id={"chat-msg-" + message.id}
      role="group"
      position="relative"
      justify={mine ? "flex-end" : "flex-start"}
      align="flex-end"
      gap="8px"
      mt={showSender ? 3 : "3px"}
      style={{
        transform: dragX ? "translateX(" + dragX + "px)" : undefined,
        transition: dragX ? "none" : "transform 0.2s ease",
        touchAction: "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      {dragX > 0 && (
        <Flex
          position="absolute"
          left={"-" + Math.min(dragX, 44) + "px"}
          top="50%"
          mt="-14px"
          boxSize="28px"
          borderRadius="full"
          bg="brand.500"
          color="white"
          align="center"
          justify="center"
          opacity={Math.min(1, dragX / SWIPE_TRIGGER_PX)}
        >
          <Icon as={MdReply} />
        </Flex>
      )}
      {!mine && (
        <Box w={AVATAR} flexShrink={0}>
          {showSender && <Avatar size="sm" w={AVATAR} h={AVATAR} name={message.sender?.name} />}
        </Box>
      )}
      <Box
        maxW={{ base: "85%", md: "60%", xl: "52%" }}
        bg={mine ? "brand.600" : otherBg}
        color={mine ? "white" : otherText}
        border={mine ? "none" : "1px solid"}
        borderColor={otherBorder}
        borderRadius="16px"
        borderBottomRightRadius={mine ? "4px" : "16px"}
        borderBottomLeftRadius={mine ? "16px" : "4px"}
        px="14px"
        py="8px"
      >
        {!mine && showSender && (
          <Text fontSize="xs" fontWeight="700" color={senderColor} mb="2px">
            {message.sender?.name}
          </Text>
        )}

        {quote && (
          <Box
            bg={mine ? "whiteAlpha.200" : quoteBg}
            borderLeft="3px solid"
            borderColor={mine ? "whiteAlpha.800" : quoteBorder}
            borderRadius="8px"
            px="10px"
            py="4px"
            mb="6px"
            cursor="pointer"
            onClick={() => onJumpTo?.(message.reply_to.id)}
          >
            {quote.name && (
              <Text fontSize="xs" fontWeight="700" color={mine ? "white" : senderColor} noOfLines={1}>
                {quote.name}
              </Text>
            )}
            <Text fontSize="xs" color={metaColor} noOfLines={2}>
              {quote.text}
            </Text>
          </Box>
        )}

        {attachment && isImage && (
          <Image
            src={fileUrl}
            alt={attachment.name}
            maxH="280px"
            borderRadius="16px"
            mt="2px"
            mb={message.body ? 2 : 0}
            cursor="zoom-in"
            onClick={() => onPreview?.(fileUrl, attachment.name)}
          />
        )}

        {attachment && !isImage && (
          <Link
            href={fileUrl}
            isExternal
            _hover={{ textDecoration: "none" }}
            display="block"
            mt="2px"
            mb={message.body ? 2 : 0}
          >
            <Flex align="center" gap={2} bg={mine ? "whiteAlpha.200" : fileBg} borderRadius="16px" p="10px">
              <Flex boxSize="36px" borderRadius="full" bg={mine ? "whiteAlpha.300" : "blue.50"} align="center" justify="center">
                <Icon as={MdInsertDriveFile} boxSize={5} color={mine ? "white" : "blue.500"} />
              </Flex>
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="600" noOfLines={1} wordBreak="break-all">
                  {attachment.name}
                </Text>
                <Text fontSize="xs" color={metaColor}>
                  {formatFileSize(attachment.size)}
                </Text>
              </Box>
            </Flex>
          </Link>
        )}

        {message.body && (
          <Text fontSize="md" lineHeight="1.5" whiteSpace="pre-wrap" wordBreak="break-word">
            {message.body}
          </Text>
        )}

        <Flex justify="flex-end" align="center" gap="6px" mt="2px">
          {attachment && (
            <Link href={downloadUrl} display="flex" aria-label="Download attachment" color={metaColor}>
              <Icon as={MdFileDownload} boxSize="14px" />
            </Link>
          )}
          <Text fontSize="10px" color={metaColor}>
            {formatChatTime(message.create_date)}
          </Text>
        </Flex>
      </Box>
      <IconButton
        aria-label="Reply"
        icon={<Icon as={MdReply} />}
        size="sm"
        variant="ghost"
        borderRadius="full"
        order={mine ? -1 : 1}
        opacity={0}
        _groupHover={{ opacity: 1 }}
        _focus={{ opacity: 1 }}
        onClick={() => onReply?.(message)}
      />
    </Flex>
  );
};

export default React.memo(ChatMessage);
