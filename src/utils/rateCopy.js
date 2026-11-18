const agentKey = (rate) => {
  const agent = rate.agent_id?.id ?? rate.agent_id;
  return agent === false || agent == null ? "" : agent;
};

const rateKey = (rate) =>
  [
    rate.rate_name,
    rate.location_text || rate.location,
    rate.charge_category_label || rate.charge_category_id?.name,
    agentKey(rate),
  ]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join("|");

// The API sends `false` for an unset order; unset sorts after every number.
const orderValue = (value) => {
  if (value === false || value == null || value === "") return Number.POSITIVE_INFINITY;
  const number = Number(value);
  return Number.isNaN(number) ? Number.POSITIVE_INFINITY : number;
};

/**
 * Source rates in the agent's own order (Group Sort Order, then Sort Order, then id), so rates the
 * backend numbers on create get the same sequence as the source instead of the selection's key order.
 */
export function sortRatesForCopy(rates) {
  return [...rates].sort((a, b) => {
    const group = orderValue(a.group_sort_order) - orderValue(b.group_sort_order);
    if (group !== 0 && !Number.isNaN(group)) return group;
    const order = orderValue(a.sort_order) - orderValue(b.sort_order);
    if (order !== 0 && !Number.isNaN(order)) return order;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

/** Source rates the target client does not already have (same rate name, location, category and agent). */
export function filterNewRates(sourceRates, existingRates) {
  const existing = new Set(existingRates.map(rateKey));
  return sourceRates.filter((rate) => !existing.has(rateKey(rate)));
}
