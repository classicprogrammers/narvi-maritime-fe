/** A charge that only applies in some cases: If Apply and DOB If Apply. Everything else always applies. */
export const isIfApplyRow = (row) => /if_apply/.test(String(row?.charge_category || ""));

/**
 * A client tariff PDF / Excel is for one agent in one location, never a mix: the groups are ordered by
 * the Group Sort Order set for that agent and location. Returns why the export can't run, or "".
 */
export function exportScopeProblem(filters = {}) {
  if (!filters.agent_id && !filters.location) return "Select an agent and a location to export.";
  if (!filters.agent_id) return "Select an agent to export.";
  if (!filters.location) return "Select a location to export.";
  return "";
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
 * Rows grouped by Group Name, in the order the backend sent them: sort_by=group_name already puts the
 * groups in tariff order and rows without a group last, so nothing is re-sorted here.
 */
export function groupRowsByGroupName(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const name = rowGroupName(row);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  });
  return [...groups].map(([name, groupRows]) => ({ name: name || OTHER_CHARGES_LABEL, rows: groupRows }));
}

/**
 * The sections of one shipment type: the Standard charges (always apply) first as a flat table, then
 * the If Apply and DOB If Apply charges (apply in certain cases), each listed under its Group Name.
 * A part without rates is left out. `groupRow(name)` builds the heading row of a group.
 */
export function buildTypeSections({ rows, head, toBody, groupRow = (name) => [name] }) {
  const ifApply = rows.filter(isIfApplyRow);
  const grouped = (sectionRows) =>
    groupRowsByGroupName(sectionRows).flatMap((group) => [groupRow(group.name), ...toBody(group.rows)]);
  return [
    { title: "Standard charges", rows: rows.filter((row) => !isIfApplyRow(row)), flat: true },
    // If Apply and DOB If Apply share one list, so the groups keep the tariff order whatever the category.
    { title: "If Apply charges", rows: ifApply },
  ]
    .filter((section) => section.rows.length > 0)
    .map(({ title, rows: sectionRows, flat }) => ({
      title,
      head,
      body: flat ? toBody(sectionRows) : grouped(sectionRows),
    }));
}

/** Sheet rows of the sections for Excel: a title row, the column headings, the body, then a blank row. */
export function sectionsToSheetRows(sections) {
  return sections.flatMap((section) => [[section.title], section.head, ...section.body, []]);
}
