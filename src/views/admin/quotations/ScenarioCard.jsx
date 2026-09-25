import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
  Flex,
  HStack,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import {
  apiString,
  detailSections,
  formatPercentDisplay,
  formatQuotationNumber,
  formatUsd,
  lineDisplayName,
  rateTypeLabel,
  scenarioAgentName,
} from "./quotationUtils";

const NUMBER_FIELDS = [
  { key: "quantity", label: "Qty" },
  { key: "buy_rate", label: "Buy rate" },
  { key: "cost_actual", label: "Cost actual" },
  { key: "roe", label: "ROE" },
  { key: "mu_percent", label: "MU %" },
  { key: "amended_value", label: "Amended" },
];

function SectionLines({ section, drafts, editable, onLineChange, borderColor, headerBg, inputBg, muted }) {
  const [open, setOpen] = useState(section.lines.length > 0);

  const table = (
    <Box overflowX="auto">
      {section.lines.length === 0 ? (
        <Text fontSize="sm" color={muted} py={2}>
          No charges in this section.
        </Text>
      ) : (
        <Table size="sm" minW="1080px" variant="unstyled">
          <Thead>
            <Tr>
              <Th {...thProps(headerBg)}>Charge</Th>
              <Th {...thProps(headerBg)}>Sel</Th>
              {NUMBER_FIELDS.map((field) => (
                <Th key={field.key} {...thProps(headerBg)}>
                  {field.label}
                </Th>
              ))}
              <Th {...thProps(headerBg)}>Rate to client</Th>
              <Th {...thProps(headerBg)}>Free text</Th>
              <Th {...thProps(headerBg)}>Remark</Th>
            </Tr>
          </Thead>
          <Tbody>
            {section.lines.map((line) => {
              const draft = drafts[String(line.id)] || {};
              const currency = apiString(line.currency);
              return (
                <Tr key={line.id ?? line.rate_id} borderTopWidth="1px" borderColor={borderColor}>
                  <Td py={2} pr={3}>
                    <Text fontSize="sm" fontWeight="600">
                      {lineDisplayName(line)}
                    </Text>
                    <Text fontSize="xs" color={muted}>
                      {[apiString(line.rate_id), currency].filter(Boolean).join(" · ") || " "}
                    </Text>
                  </Td>
                  <Td>
                    <Checkbox
                      isChecked={Boolean(draft.selected)}
                      isDisabled={!editable || line.id == null}
                      colorScheme="blue"
                      onChange={(event) => onLineChange(line.id, "selected", event.target.checked)}
                    />
                  </Td>
                  {NUMBER_FIELDS.map((field) => (
                    <Td key={field.key}>
                      {editable && line.id != null ? (
                        <Input
                          size="sm"
                          type="number"
                          bg={inputBg}
                          w="88px"
                          value={draft[field.key] ?? ""}
                          onChange={(event) => onLineChange(line.id, field.key, event.target.value)}
                        />
                      ) : (
                        <Text fontSize="sm">{draft[field.key] || "—"}</Text>
                      )}
                    </Td>
                  ))}
                  <Td>
                    <Text fontSize="sm" whiteSpace="nowrap">
                      {formatQuotationNumber(line.rate_to_client)}
                    </Text>
                  </Td>
                  <Td>
                    {editable && line.id != null ? (
                      <Input
                        size="sm"
                        bg={inputBg}
                        w="140px"
                        value={draft.free_text ?? ""}
                        onChange={(event) => onLineChange(line.id, "free_text", event.target.value)}
                      />
                    ) : (
                      <Text fontSize="sm">{draft.free_text || "—"}</Text>
                    )}
                  </Td>
                  <Td>
                    {editable && line.id != null ? (
                      <Input
                        size="sm"
                        bg={inputBg}
                        w="140px"
                        value={draft.remark ?? ""}
                        onChange={(event) => onLineChange(line.id, "remark", event.target.value)}
                      />
                    ) : (
                      <Text fontSize="sm">{draft.remark || "—"}</Text>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </Box>
  );

  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="12px" overflow="hidden">
      <Flex bg={headerBg} px={3} py={2} align="center" justify="space-between">
        <Button
          variant="ghost"
          size="sm"
          px={1}
          leftIcon={open ? <MdExpandLess /> : <MdExpandMore />}
          onClick={() => setOpen((value) => !value)}
        >
          {section.label}
          <Text as="span" ml={2} fontWeight="400" color={muted}>
            {section.lines.length}
          </Text>
        </Button>
      </Flex>
      <Box px={3} pb={open ? 2 : 0}>
        <Collapse in={open}>{table}</Collapse>
      </Box>
    </Box>
  );
}

function thProps(headerBg) {
  return {
    bg: headerBg,
    fontSize: "11px",
    textTransform: "uppercase",
    py: 2,
    whiteSpace: "nowrap",
  };
}

export default function ScenarioCard({ scenario, drafts, editable, name, onNameChange, onLineChange }) {
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const cardBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const inputBg = useColorModeValue("white", "gray.900");
  const muted = useColorModeValue("gray.500", "gray.400");
  const sections = detailSections(scenario?.sections);

  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="16px" bg={cardBg} p={4}>
      <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap" mb={4}>
        <Box flex="1" minW="220px">
          {editable ? (
            <Input
              size="sm"
              mb={2}
              bg={inputBg}
              value={name}
              placeholder="Scenario name"
              onChange={(event) => onNameChange(event.target.value)}
            />
          ) : (
            <Text fontWeight="700" mb={1}>
              {name || scenario?.origin || "Scenario"}
            </Text>
          )}
          <HStack spacing={2} wrap="wrap">
            <Text fontSize="sm">{scenario?.origin || "—"}</Text>
            <Text fontSize="sm" color={muted}>
              {scenarioAgentName(scenario)}
            </Text>
            <Badge>{rateTypeLabel(scenario?.rate_type)}</Badge>
          </HStack>
        </Box>
        <HStack spacing={6} align="flex-start">
          <Metric label="Standard subtotal" value={formatUsd(scenario?.subtotal_standard_usd)} />
          <Metric label="Selected subtotal" value={formatUsd(scenario?.subtotal_selected_usd)} />
          <Metric label="Profit margin" value={formatPercentDisplay(scenario?.profit_margin_percent)} />
        </HStack>
      </Flex>
      <Flex direction="column" gap={3}>
        {sections.map((section) => (
          <SectionLines
            key={section.key}
            section={section}
            drafts={drafts}
            editable={editable}
            onLineChange={onLineChange}
            borderColor={borderColor}
            headerBg={headerBg}
            inputBg={inputBg}
            muted={muted}
          />
        ))}
      </Flex>
    </Box>
  );
}

function Metric({ label, value }) {
  return (
    <Box>
      <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color="gray.500">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="700">
        {value}
      </Text>
    </Box>
  );
}
