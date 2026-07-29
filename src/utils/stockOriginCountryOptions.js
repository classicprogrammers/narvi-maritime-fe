/** Options for Origin country SimpleSearchableSelect (value stored as country name in origin_text). */
export function buildOriginCountrySelectOptions(countries = [], extraOriginTexts = []) {
  const byKey = new Map();
  (countries || []).forEach((c) => {
    const name = String(c.name || c.code || "").trim();
    if (!name) return;
    byKey.set(name.toLowerCase(), {
      id: c.id ?? c.country_id ?? name,
      name,
    });
  });
  (extraOriginTexts || []).forEach((text) => {
    const name = String(text ?? "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, { id: name, name });
    }
  });
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
}
