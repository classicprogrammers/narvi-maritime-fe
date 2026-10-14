/** Shared helpers for the Agent Tariffs and Client Tariffs screens. */

export const TARIFF_PAGE_SIZE = 50;

export function displayTariffValue(value) {
  if (value === false || value == null || String(value).trim() === "") return "-";
  return String(value);
}

/** Options keyed by numeric id (agents, clients). */
export function normalizeIdOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option) => {
      if (option == null || option.id == null || option.id === "") return null;
      return { ...option, name: option.name ?? option.display_name ?? `#${option.id}` };
    })
    .filter(Boolean);
}

/** Options keyed by their name string (locations, groups). Accepts strings or objects. */
export function normalizeNameOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option) => {
      const name =
        typeof option === "string"
          ? option
          : option?.name ?? option?.location ?? option?.import_group ?? "";
      if (!String(name).trim()) return null;
      return { id: String(name), name: String(name) };
    })
    .filter(Boolean);
}

/** Yes/No options keyed by their value. */
export function normalizeYesNoOptions(raw) {
  const fallback = [
    { id: "true", name: "Yes" },
    { id: "false", name: "No" },
  ];
  if (!Array.isArray(raw) || !raw.length) return fallback;
  return raw
    .map((option) => {
      const id = option?.id ?? option?.value;
      if (id == null) return null;
      return { id: String(id), name: option?.name ?? option?.label ?? String(id) };
    })
    .filter(Boolean);
}

export function withSelectedOption(options, value, pinned) {
  if (value === "" || value == null || !pinned) return options;
  if (options.some((option) => String(option.id) === String(value))) return options;
  return [pinned, ...options];
}

export function formatAgentOption(agent) {
  if (!agent) return "";
  const code = agent.name || agent.agentid || "";
  const company = agent.company_name || "";
  if (code && company && code !== company) return `${code} — ${company}`;
  return code || company || `Agent ${agent.id}`;
}

export function intParam(value) {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function tariffErrorMessage(error, fallback) {
  const data = error?.response?.data;
  return data?.message || data?.result?.message || error?.message || fallback;
}
