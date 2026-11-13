import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdArrowForward, MdChat } from "react-icons/md";
import { useHistory, useLocation } from "react-router-dom";
import { getChatMessages } from "api/chat";
import { useChatAccess } from "hooks/useChatAccess";
import {
  countUnread,
  formatChatTime,
  maxMessageId,
  messagePreview,
  readLastSeenId,
  writeLastSeenId,
} from "utils/chat";

const POLL_MS = 6000;

// Navbar chat button: unread dot + recent messages popover. Hidden without chat permission.
export default function NavbarChat() {
  const history = useHistory();
  const location = useLocation();
  const { canChat } = useChatAccess();
  const [recent, setRecent] = useState([]);
  const [lastSeen, setLastSeen] = useState(readLastSeenId());
  const onChatPage = location.pathname.startsWith("/admin/chat");

  const iconColor = useColorModeValue("gray.500", "white");
  const hoverBg = useColorModeValue("blue.50", "whiteAlpha.200");
  const menuBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("#E6ECFA", "rgba(135, 140, 189, 0.3)");
  const rowHover = useColorModeValue("gray.50", "whiteAlpha.100");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  const shadow = useColorModeValue(
    "14px 17px 40px 4px rgba(112, 144, 176, 0.18)",
    "14px 17px 40px 4px rgba(112, 144, 176, 0.06)"
  );

  useEffect(() => {
    if (!canChat) return undefined;
    let stopped = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const { messages } = await getChatMessages({ limit: 30 });
        if (!stopped) setRecent(messages);
      } catch (e) {
        // best-effort; the chat page shows real errors
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    const syncSeen = () => setLastSeen(readLastSeenId());
    window.addEventListener("chat:seen", syncSeen);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("chat:seen", syncSeen);
    };
  }, [canChat]);

  if (!canChat) return null;

  const unread = onChatPage ? 0 : countUnread(recent, lastSeen);
  const latest = recent.slice(-4).reverse();

  // Looking at the dropdown counts as reading it, so the badge doesn't come right back on the next poll
  const markSeen = () => {
    const newest = maxMessageId(recent);
    if (newest > lastSeen) {
      writeLastSeenId(newest);
      setLastSeen(newest);
    }
  };

  return (
    <Popover placement="bottom-end" isLazy onOpen={markSeen}>
      {({ onClose }) => (
        <>
          <PopoverTrigger>
            <Box position="relative" me="8px">
              <Tooltip label="Team Chat" hasArrow>
                <IconButton
                  aria-label="Open chat"
                  variant="ghost"
                  borderRadius="full"
                  boxSize="40px"
                  color={iconColor}
                  _hover={{ bg: hoverBg, color: "blue.600" }}
                  icon={<Icon as={MdChat} boxSize="22px" />}
                />
              </Tooltip>
              {unread > 0 && (
                <Box
                  position="absolute"
                  top="4px"
                  right="4px"
                  boxSize="10px"
                  bg="red.500"
                  borderRadius="full"
                  border="2px solid"
                  borderColor={menuBg}
                  pointerEvents="none"
                />
              )}
            </Box>
          </PopoverTrigger>
          <PopoverContent w="340px" bg={menuBg} border="none" borderRadius="20px" boxShadow={shadow} overflow="hidden">
            <PopoverHeader
              border="none"
              bgGradient="linear(to-r, brand.500, brand.700)"
              color="white"
              px="16px"
              py="14px"
            >
              <Flex align="center" gap="10px">
                <Flex bg="whiteAlpha.300" borderRadius="full" boxSize="32px" align="center" justify="center">
                  <Icon as={MdChat} />
                </Flex>
                <Box>
                  <Text fontWeight="700" lineHeight="short">
                    Team Chat
                  </Text>
                  <Text fontSize="xs" opacity={0.85}>
                    {unread > 0 ? `${unread} new message${unread > 1 ? "s" : ""}` : "You're all caught up"}
                  </Text>
                </Box>
              </Flex>
            </PopoverHeader>
            <PopoverBody p="8px">
              {latest.length === 0 ? (
                <Text fontSize="sm" color={mutedColor} textAlign="center" py="18px">
                  No messages yet
                </Text>
              ) : (
                latest.map((m) => {
                  const isNew = !m.is_mine && m.id > lastSeen && !onChatPage;
                  return (
                    <Flex
                      key={m.id}
                      gap="10px"
                      p="8px"
                      borderRadius="12px"
                      align="center"
                      cursor="pointer"
                      _hover={{ bg: rowHover }}
                      onClick={() => {
                        onClose();
                        history.push("/admin/chat");
                      }}
                    >
                      <Avatar size="sm" name={m.sender?.name} />
                      <Box flex="1" minW={0}>
                        <Flex justify="space-between" gap="8px">
                          <Text fontSize="sm" fontWeight={isNew ? "700" : "600"} noOfLines={1}>
                            {m.is_mine ? "You" : m.sender?.name}
                          </Text>
                          <Text fontSize="xs" color={mutedColor} flexShrink={0}>
                            {formatChatTime(m.create_date)}
                          </Text>
                        </Flex>
                        <Text fontSize="xs" color={mutedColor} noOfLines={1} fontWeight={isNew ? "600" : "400"}>
                          {messagePreview(m)}
                        </Text>
                      </Box>
                      {isNew && <Box boxSize="8px" bg="red.500" borderRadius="full" flexShrink={0} />}
                    </Flex>
                  );
                })
              )}
              <Button
                mt="6px"
                w="100%"
                size="sm"
                colorScheme="blue"
                borderRadius="full"
                rightIcon={<MdArrowForward />}
                onClick={() => {
                  onClose();
                  history.push("/admin/chat");
                }}
              >
                Open chat
              </Button>
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  );
}
