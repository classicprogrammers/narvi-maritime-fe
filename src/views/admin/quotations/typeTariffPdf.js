import { getAgentByIdQueryApi } from "../../../api/vendor";
import { buildTypeSections, uniqueCurrencies } from "../../../utils/clientTariffSections";
import { buildPdfModel } from "./rateListPdf";
import { toTableRows } from "./tariffScreenUtils";

export const PDF_TYPE_LABELS = { export: "Export", import_dob: "Import + DOB" };

const CURRENCY_COLUMN = { key: "currency", label: "Currency", render: (row) => row.currency ?? row.currency_id?.name };

// Same columns as the Client Tariffs PDFs: the Standard / If Apply split is the section heading instead of a column.
const PDF_COLUMNS = [
  { key: "rate_name", label: "Rate Name" },
  CURRENCY_COLUMN,
  { key: "sales", label: "Charges", isNumeric: true },
  { key: "rate_calculation", label: "Rate Calculation" },
];

/** Consignee block of the selected agent: its "CNEE 2" entry (Narvi Singapore warehouse). */
export async function loadConsigneeText(agentId) {
  if (!agentId) return "";
  try {
    const agent = await getAgentByIdQueryApi(agentId);
    const entries = Array.isArray(agent?.agent_cnee_ids) ? agent.agent_cnee_ids : [];
    const entry = entries.find((item) => /cnee\s*2|^2$/i.test(String(item?.cnee1 || "").trim())) || entries[1];
    return String(entry?.cnee_text || "").trim();
  } catch (error) {
    return "";
  }
}

/**
 * PDF model of one shipment type (Export or Import + DOB): Standard charges first, then the If Apply charges
 * under their Group Name, as in the Client Tariffs PDFs. A single currency is printed once under the name.
 */
export function buildTypeTariffPdfModel({ shipmentType, rows, location, scopeLabel, consignee, filenameSuffix }) {
  const typeLabel = PDF_TYPE_LABELS[shipmentType];
  const currencies = uniqueCurrencies(rows);
  // One currency is printed once; none (the backend sent no currency) leaves the column out as well.
  const columns = currencies.length > 1 ? PDF_COLUMNS : PDF_COLUMNS.filter((column) => column.key !== "currency");
  return buildPdfModel({
    title: location ? `${typeLabel} Tariffs - ${location}` : `${typeLabel} Tariffs`,
    tariffHeader: true,
    scopeLabel,
    currencyLabel: currencies.length === 1 ? `Currency: ${currencies[0]}` : "",
    sections: buildTypeSections({
      rows,
      head: columns.map((column) => column.label),
      toBody: (sectionRows) => toTableRows(columns, sectionRows),
      groupRow: (name) => [
        {
          content: name,
          colSpan: columns.length,
          styles: { fontStyle: "bold", fontSize: 8, halign: "left", textColor: [0, 0, 0], fillColor: [225, 225, 225] },
        },
      ],
    }),
    footerBlocks: [consignee],
    filenameSuffix,
  });
}
