import React, { useState } from "react";
import { Box, Button, Checkbox, Collapse, Flex, HStack, Text, useColorModeValue } from "@chakra-ui/react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

function RateRow({ rate, checked, onToggle, borderColor, muted }) {
  return (
    <Flex py={2} align="center" gap={3} borderBottomWidth="1px" borderColor={borderColor}>
      <Checkbox isChecked={checked} colorScheme="blue" onChange={(event) => onToggle(rate.id, event.target.checked)} />
      <Box flex="1" minW={0}>
        <Text fontSize="sm" fontWeight="600" noOfLines={1}>
          {rate.rate_name || rate.name || rate.rate_id || `Rate ${rate.id}`}
        </Text>
        {rate.rate_id ? (
          <Text fontSize="xs" color={muted}>
            {rate.rate_id}
          </Text>
        ) : null}
      </Box>
      <Text fontSize="sm" whiteSpace="nowrap">
        {[rate.currency, rate.rate_float].filter((part) => part != null && part !== "").join(" ") || "—"}
      </Text>
    </Flex>
  );
}

function SectionBlock({ section, selectedByRateId, onToggle, onToggleSection }) {
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.500", "gray.400");
  const headerBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const rates = section.rates || [];
  const [open, setOpen] = useState(rates.length > 0);

  const body = rates.length ? (
    rates.map((rate) => (
      <RateRow
        key={rate.id}
        rate={rate}
        checked={Boolean(selectedByRateId[String(rate.id)])}
        onToggle={onToggle}
        borderColor={borderColor}
        muted={muted}
      />
    ))
  ) : (
    <Text fontSize="sm" color={muted} py={2}>
      No charges in this section.
    </Text>
  );

  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="12px" overflow="hidden">
      <Flex bg={headerBg} px={3} py={2} align="center" justify="space-between" gap={3}>
        <Button
          variant="ghost"
          size="sm"
          px={1}
          leftIcon={open ? <MdExpandLess /> : <MdExpandMore />}
          onClick={() => setOpen((value) => !value)}
        >
          {section.label}
          <Text as="span" ml={2} fontWeight="400" color={muted}>
            {rates.length}
          </Text>
        </Button>
        {rates.length > 0 ? (
          <HStack spacing={2}>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setOpen(true);
                onToggleSection(section, true);
              }}
            >
              Select all
            </Button>
            <Button size="xs" variant="ghost" onClick={() => onToggleSection(section, false)}>
              Clear
            </Button>
          </HStack>
        ) : null}
      </Flex>
      <Box px={3} pb={open ? 1 : 0}>
        <Collapse in={open}>{body}</Collapse>
      </Box>
    </Box>
  );
}

export default function RateCheckboxList({ sections = [], selectedByRateId = {}, onToggle, onToggleSection }) {
  return (
    <Flex direction="column" gap={3}>
      {sections.map((section) => (
        <SectionBlock
          key={section.key}
          section={section}
          selectedByRateId={selectedByRateId}
          onToggle={onToggle}
          onToggleSection={onToggleSection}
        />
      ))}
    </Flex>
  );
}
