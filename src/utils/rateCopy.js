const rateKey = (rate) =>
  [rate.rate_name, rate.location_text || rate.location, rate.charge_category_label || rate.charge_category_id?.name]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join("|");

/** Source rates the target client does not already have (same rate name, location and category). */
export function filterNewRates(sourceRates, existingRates) {
  const existing = new Set(existingRates.map(rateKey));
  return sourceRates.filter((rate) => !existing.has(rateKey(rate)));
}
