import React, { useMemo } from "react";
import { Box, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tooltip, Tr, useColorModeValue } from "@chakra-ui/react";
import DashboardPanel from "components/ledger/dashboards/DashboardPanel";
import DashboardStatTiles from "components/ledger/dashboards/DashboardStatTiles";
import useLedgerDashboard from "hooks/useLedgerDashboard";
import { getDashboardCash } from "api/ledgerDashboard";
import { formatDateDMY } from "utils/dateFormat";
import { formatDashboardMoney } from "views/admin/default/dashboardUtils";
import { sortRows } from "utils/ledgerDashboardData";

const EMPTY_TEXT = "No outstanding amounts.";

function TruncatedText({ value, maxW = "240px" }) {
  const text = value == null || value === false ? "" : String(value);
  const display = text || "—";
  return (
    <Tooltip label={text} isDisabled={!text || text.length < 14} openDelay={250} hasArrow placement="top">
      <Text fontSize="sm" maxW={maxW} noOfLines={1}>
        {display}
      </Text>
    </Tooltip>
  );
}

// One table (agents or clients), sorted by outstanding descending
function CashTable({ rows, nameKey, nameLabel }) {
  const headColor = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.100");
  const negativeColor = useColorModeValue("red.500", "red.300");
  const sorted = useMemo(() => sortRows(rows, "outstanding_usd", "desc"), [rows]);

  if (!sorted.length) {
    return (
      <Text fontSize="sm" color={headColor}>
        {EMPTY_TEXT}
      </Text>
    );
  }

  return (
    <TableContainer overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th color={headColor} borderColor={borderColor}>
              {nameLabel}
            </Th>
            <Th isNumeric color={headColor} borderColor={borderColor}>
              Outstanding USD
            </Th>
            <Th isNumeric color={headColor} borderColor={borderColor}>
              Overdue USD
            </Th>
            <Th isNumeric color={headColor} borderColor={borderColor}>
              Invoices
            </Th>
            <Th color={headColor} borderColor={borderColor}>
              Oldest due date
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {sorted.map((row, index) => (
            <Tr key={row[`${nameKey.replace("_name", "_id")}`] ?? `${row[nameKey]}-${index}`}>
              <Td borderColor={borderColor}>
                <TruncatedText value={row[nameKey]} />
              </Td>
              <Td isNumeric borderColor={borderColor}>
                {formatDashboardMoney(row.outstanding_usd)}
              </Td>
              <Td isNumeric borderColor={borderColor} color={row.overdue_usd > 0 ? negativeColor : undefined}>
                {formatDashboardMoney(row.overdue_usd)}
              </Td>
              <Td isNumeric borderColor={borderColor}>
                {row.invoice_count}
              </Td>
              <Td borderColor={borderColor} whiteSpace="nowrap">
                {formatDateDMY(row.oldest_due_date) || "—"}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

// Cash dashboard (D1): outstanding to agents / from clients, snapshot as of today. No period filter.
export default function CashTab() {
  const { data, isLoading, error, reload } = useLedgerDashboard(getDashboardCash, {});
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");

  const isEmpty = !!data && !data.agents.rows.length && !data.clients.rows.length;
  const showState = !data || isEmpty || (error && !isLoading);

  if (showState) {
    return (
      <DashboardPanel
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        isEmpty={isEmpty}
        emptyText={EMPTY_TEXT}
        onRetry={reload}
      />
    );
  }

  const asOf = data.as_of ? `as of ${formatDateDMY(data.as_of)}` : "as of today";
  const tiles = [
    { key: "agents", label: "Total outstanding to agents", value: data.agents.total_usd, type: "usd", hint: asOf, negativeRed: false },
    { key: "clients", label: "Total outstanding from clients", value: data.clients.total_usd, type: "usd", hint: asOf, negativeRed: false },
  ];

  return (
    <Box opacity={isLoading ? 0.6 : 1} transition="opacity 0.15s">
      <DashboardStatTiles tiles={tiles} columns={{ base: 1, md: 2 }} />
      <DashboardPanel title="Agents" mb={4} onRetry={reload}>
        <CashTable rows={data.agents.rows} nameKey="agent_name" nameLabel="Agent" />
      </DashboardPanel>
      <DashboardPanel title="Clients" onRetry={reload}>
        <CashTable rows={data.clients.rows} nameKey="client_name" nameLabel="Client" />
      </DashboardPanel>
      <Text fontSize="xs" color={muted} mt={2}>
        Amounts in USD.
      </Text>
    </Box>
  );
}
