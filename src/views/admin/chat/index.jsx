import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Center,
  Flex,
  Icon,
  Image,
  Modal,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdChat } from "react-icons/md";
import { getChatMembers } from "api/chat";
import { useChat } from "hooks/useChat";
import { useChatAccess } from "hooks/useChatAccess";
import { buildChatItems, writeLastSeenId } from "utils/chat";
import ChatMessage from "./ChatMessage";
import ChatComposer from "./ChatComposer";

const NEAR_BOTTOM_PX = 120;

const Chat = () => {
  const { me, canChat, loading: accessLoading } = useChatAccess();
  const { messages, hasMore, loading, loadingOlder, error, loadOlder, send } = useChat(canChat);
  const [preview, setPreview] = useState(null);
  const [members, setMembers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevHeightRef = useRef(null);
  const initialScrollDone = useRef(false);

  const panelBg = useColorModeValue("gray.50", "navy.900");
  const headerBg = useColorModeValue("white", "navy.800");
  const headerBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const titleColor = useColorModeValue("gray.800", "white");
  const subColor = useColorModeValue("gray.600", "gray.300");
  const mutedText = useColorModeValue("gray.600", "gray.300");
  const dayBg = useColorModeValue("gray.200", "navy.700");
  const dayText = useColorModeValue("gray.700", "gray.100");

  useEffect(() => {
    if (!canChat) return;
    getChatMembers().then(setMembers).catch(() => setMembers([]));
  }, [canChat]);

  const items = useMemo(() => buildChatItems(messages), [messages]);

  // Keep the view pinned to the newest message, or hold position after loading history
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeightRef.current != null) {
      el.scrollTop = el.scrollHeight - prevHeightRef.current;
      prevHeightRef.current = null;
    } else if (!initialScrollDone.current && messages.length) {
      el.scrollTop = el.scrollHeight;
      initialScrollDone.current = true;
    } else if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = async () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (el.scrollTop < 60 && hasMore && !loadingOlder) {
      prevHeightRef.current = el.scrollHeight;
      const loaded = await loadOlder();
      if (!loaded) prevHeightRef.current = null;
    }
  };

  // Opening the chat (and every new message while it is open) counts as seen
  useEffect(() => {
    const newest = messages.length ? messages[messages.length - 1].id : 0;
    if (newest) writeLastSeenId(newest);
  }, [messages]);

  // After my own send, jump to the bottom
  const handleSend = async (payload) => {
    stickToBottomRef.current = true;
    const sent = await send({ ...payload, replyToId: replyTo ? replyTo.id : undefined });
    setReplyTo(null);
    return sent;
  };

  // Scroll to the quoted message and flash it
  const jumpTo = (id) => {
    const el = document.getElementById("chat-msg-" + id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.animate([{ background: "rgba(67,24,255,0.18)" }, { background: "transparent" }], { duration: 1400 });
  };

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (e) => e.key === "Escape" && setPreview(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  if (accessLoading) {
    return (
      <Center pt="120px">
        <Spinner />
      </Center>
    );
  }

  // Access revoked while the page was open: the chat calls start failing with a permission error
  const accessRevoked = /permission/i.test(error || "");

  if (!canChat || accessRevoked) {
    return (
      <Center pt="120px">
        <Text color="gray.500">You do not have permission to use chat.</Text>
      </Center>
    );
  }

  let lastSenderId = null;

  return (
    <Flex
      direction="column"
      mt={{ base: "70px", md: "70px" }}
      h={{ base: "calc(100vh - 160px)", md: "calc(100vh - 170px)" }}
      minH="420px"
      bg={panelBg}
      border="1px solid"
      borderColor={headerBorder}
      borderRadius="md"
      overflow="hidden"
    >
      <Flex
        px={{ base: 4, md: 6 }}
        py={3}
        align="center"
        gap={3}
        bg={headerBg}
        borderBottom="1px solid"
        borderColor={headerBorder}
      >
        <Flex bg="brand.500" color="white" borderRadius="full" boxSize="40px" align="center" justify="center">
          <Icon as={MdChat} boxSize={5} />
        </Flex>
        <Box minW={0}>
          <Text fontWeight="bold" fontSize="lg" lineHeight="short" color={titleColor}>
            Team Chat
          </Text>
          <Text fontSize="xs" color={subColor} noOfLines={1}>
            {members.length ? members.map((m) => m.name).join(", ") : me?.name ? `Signed in as ${me.name}` : ""}
          </Text>
        </Box>
        <AvatarGroup size="sm" max={4} ml="auto" display={{ base: "none", md: "flex" }}>
          {members.map((m) => (
            <Avatar key={m.id} name={m.name} />
          ))}
        </AvatarGroup>
      </Flex>

      <Box ref={scrollRef} onScroll={handleScroll} flex="1" overflowY="auto" px={{ base: 3, md: 8 }} py={4}>
        {loadingOlder && (
          <Center py={2}>
            <Spinner size="sm" />
          </Center>
        )}
        {!hasMore && !loading && messages.length > 0 && (
          <Text textAlign="center" fontSize="xs" color={mutedText} mb={2}>
            Start of conversation
          </Text>
        )}
        {loading && (
          <Center pt={10}>
            <Spinner />
          </Center>
        )}
        {!loading && error && messages.length === 0 && (
          <Center pt={10} flexDirection="column" gap={3}>
            <Text color="red.500">{error}</Text>
            <Button size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Center>
        )}
        {!loading && !error && messages.length === 0 && (
          <Center pt={10}>
            <Text color={mutedText}>No messages yet. Say hello!</Text>
          </Center>
        )}

        {items.map((item) => {
          if (item.type === "day") {
            lastSenderId = null;
            return (
              <Flex key={item.key} justify="center" my={3}>
                <Text fontSize="xs" fontWeight="600" bg={dayBg} color={dayText} px={4} py="3px" borderRadius="full">
                  {item.label}
                </Text>
              </Flex>
            );
          }
          const m = item.message;
          const showSender = m.sender?.id !== lastSenderId;
          lastSenderId = m.sender?.id;
          return (
            <ChatMessage
              key={item.key}
              message={m}
              showSender={showSender}
              onPreview={(url, name) => setPreview({ url, name })}
              onReply={setReplyTo}
              onJumpTo={jumpTo}
            />
          );
        })}
      </Box>

      <ChatComposer onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />

      <Modal isOpen={Boolean(preview)} onClose={() => setPreview(null)} size="6xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="transparent" boxShadow="none" w="auto" maxW="95vw" onClick={() => setPreview(null)}>
          {preview && <Image src={preview.url} alt={preview.name} maxH="90vh" objectFit="contain" mx="auto" />}
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default Chat;
