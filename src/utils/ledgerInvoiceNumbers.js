// Split free text on new lines, commas, semicolons; trim, drop empty, dedupe case-insensitively
export const splitInvoiceNumbers = (text) => {
  const seen = new Set();
  const out = [];
  String(text ?? "")
    .split(/[\n\r,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(part);
      }
    });
  return out;
};

// Backend wording: "Invoice number X from AGENT was already booked on SO N by NAME on DATE."
export const formatDuplicateMessage = (dup, agentLabel) => {
  const parts = [`Invoice number ${dup?.invoice ?? ""}`];
  if (agentLabel) parts.push(`from ${agentLabel}`);
  parts.push("was already booked");
  if (dup?.so_number) parts.push(`on ${/^so/i.test(String(dup.so_number)) ? "" : "SO "}${dup.so_number}`);
  if (dup?.booked_by) parts.push(`by ${dup.booked_by}`);
  if (dup?.booked_on) parts.push(`on ${dup.booked_on}`);
  return `${parts.join(" ").replace(/\s+/g, " ")}.`;
};

const norm = (v) => splitInvoiceNumbers(v).map((s) => s.toLowerCase()).sort().join("|");

// Same set of invoice numbers (order and case ignored) -> same key
export const invoiceNumbersKey = norm;

const relationId = (v) => {
  if (Array.isArray(v)) return v[0] == null ? "" : String(v[0]);
  if (v && typeof v === "object") return v.id == null ? "" : String(v.id);
  return v == null || v === false ? "" : String(v);
};

const relationLabel = (v) => {
  if (Array.isArray(v)) return v[1] ? String(v[1]) : "";
  if (v && typeof v === "object") return String(v.name || v.display_name || "");
  return typeof v === "string" ? v : "";
};

// Active cost records that already carry one of the typed invoice numbers under ANOTHER agent.
// Same-agent duplicates are left to the server check. [{ invoice, record_id, so_number, agent_name }]
export const findOtherAgentDuplicates = (records, invoices, { agentId, excludeId } = {}) => {
  const wanted = new Map(splitInvoiceNumbers(invoices).map((n) => [n.toLowerCase(), n]));
  const seen = new Set();
  const out = [];
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (!record || record.id == null || seen.has(record.id)) return;
    if (excludeId != null && excludeId !== "" && String(record.id) === String(excludeId)) return;
    if (record.is_cancelled || record.state === "cancelled") return;
    const recordAgent = relationId(record.agent_detail) || relationId(record.agent_id);
    if (agentId != null && agentId !== "" && recordAgent === String(agentId)) return;
    const hits = splitInvoiceNumbers(record.invoices)
      .map((n) => wanted.get(n.toLowerCase()))
      .filter(Boolean);
    if (!hits.length) return;
    seen.add(record.id);
    const soNumber = record.so_number || relationLabel(record.sale_order_id);
    const agentName = (typeof record.agent === "string" && record.agent) || relationLabel(record.agent_detail) || relationLabel(record.agent_id);
    hits.forEach((invoice) =>
      out.push({ invoice, record_id: record.id, so_number: soNumber || "", agent_name: agentName })
    );
  });
  return out;
};

// Pre-check only with an agent and at least one number, and only if either changed (original optional)
export const shouldPrecheckInvoices = (form, original) => {
  const agent = form?.agent_id;
  if (agent == null || agent === "" || agent === false) return false;
  if (splitInvoiceNumbers(form?.invoices).length === 0) return false;
  if (!original) return true;
  return (
    norm(form.invoices) !== norm(original.invoices) ||
    String(agent) !== String(original.agent_id ?? "")
  );
};
