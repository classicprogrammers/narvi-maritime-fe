/** A charge that only applies in some cases: If Apply and DOB If Apply. Everything else always applies. */
export const isIfApplyRow = (row) => /if_apply/.test(String(row?.charge_category || ""));

const sortValue = (row) => {
  const value = Number(row?.sort_order);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
};

/** Sort Order ascending, rows without one last, original order kept for equal values. */
export function sortBySortOrder(rows) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => sortValue(a.row) - sortValue(b.row) || a.index - b.index)
    .map(({ row }) => row);
}

/** The different currencies of a list of tariff rows, in first-seen order. */
export function uniqueCurrencies(rows) {
  const codes = rows
    .map((row) => String(row?.currency || row?.currency_id?.name || "").trim())
    .filter(Boolean);
  return [...new Set(codes)];
}

/**
 * The PDF sections of one shipment type: the Standard charges (always apply) first, then the
 * If Apply charges (apply in certain cases), each in Sort Order. A part without rates is left out.
 */
export function buildTypeSections({ rows, head, toBody }) {
  return [
    { title: "Standard charges", rows: sortBySortOrder(rows.filter((row) => !isIfApplyRow(row))) },
    { title: "If Apply charges", rows: sortBySortOrder(rows.filter(isIfApplyRow)) },
  ]
    .filter((section) => section.rows.length > 0)
    .map(({ title, rows: sectionRows }) => ({ title, head, body: toBody(sectionRows) }));
}
