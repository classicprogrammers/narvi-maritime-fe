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

export const OTHER_CHARGES_LABEL = "Other charges";

/** The Group Name of a rate. The backend sends `false` when the rate has no group. */
export const rowGroupName = (row) => (typeof row?.group_name === "string" ? row.group_name.trim() : "");

/**
 * Rows grouped by Group Name: groups A-Z, rows without a group last as "Other charges".
 * Rows keep their order inside a group (Sort Order, rows without one last).
 */
export function groupRowsByGroupName(rows) {
  const groups = new Map();
  sortBySortOrder(rows).forEach((row) => {
    const name = rowGroupName(row);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  });
  const named = [...groups.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b));
  return [...named, ...(groups.has("") ? [""] : [])].map((name) => ({
    name: name || OTHER_CHARGES_LABEL,
    rows: groups.get(name),
  }));
}

/**
 * The sections of one shipment type: the Standard charges (always apply) first as a flat table, then
 * the If Apply and DOB If Apply charges (apply in certain cases), each listed under its Group Name.
 * A part without rates is left out. `groupRow(name)` builds the heading row of a group.
 */
export function buildTypeSections({ rows, head, toBody, groupRow = (name) => [name] }) {
  const ifApply = rows.filter(isIfApplyRow);
  const isDob = (row) => /^dob_/.test(String(row?.charge_category || ""));
  const grouped = (sectionRows) =>
    groupRowsByGroupName(sectionRows).flatMap((group) => [groupRow(group.name), ...toBody(group.rows)]);
  return [
    { title: "Standard charges", rows: rows.filter((row) => !isIfApplyRow(row)), flat: true },
    { title: "If Apply charges", rows: ifApply.filter((row) => !isDob(row)) },
    { title: "DOB If Apply charges", rows: ifApply.filter(isDob) },
  ]
    .filter((section) => section.rows.length > 0)
    .map(({ title, rows: sectionRows, flat }) => ({
      title,
      head,
      body: flat ? toBody(sortBySortOrder(sectionRows)) : grouped(sectionRows),
    }));
}

/** Sheet rows of the sections for Excel: a title row, the column headings, the body, then a blank row. */
export function sectionsToSheetRows(sections) {
  return sections.flatMap((section) => [[section.title], section.head, ...section.body, []]);
}
