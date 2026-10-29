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
