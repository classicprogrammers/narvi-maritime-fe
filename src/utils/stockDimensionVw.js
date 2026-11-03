/** Dimensions of the saved stock (matched by id in a stock list response, or a single-record response). */
export function findSavedDimensions(response, stockId = null) {
  const result = response?.result ?? response;
  const list = result?.stock_list ?? response?.stock_list;
  if (Array.isArray(list) && stockId != null) {
    const match = list.find((item) => String(item?.id) === String(stockId));
    if (match && Array.isArray(match.dimensions)) return match.dimensions;
  }
  const candidates = [
    result?.data,
    result?.stock,
    result?.stock_item,
    result,
    result?.data?.stock_list?.[0],
    result?.stock_list?.[0],
    result?.lines?.[0],
    response?.data,
  ];
  for (const candidate of candidates) {
    if (candidate && Array.isArray(candidate.dimensions)) return candidate.dimensions;
  }
  return [];
}

/**
 * VW (cw_air_freight) is calculated by the backend on save, so form dimensions still hold the
 * pre-save value (0). Take the saved value per piece, matched by id or else by position.
 */
export function mergeSavedDimensionVw(dimensions = [], savedDimensions = []) {
  if (!Array.isArray(dimensions) || !Array.isArray(savedDimensions) || !savedDimensions.length) {
    return dimensions;
  }
  return dimensions.map((dim, index) => {
    const saved =
      (dim?.id != null && savedDimensions.find((s) => s?.id != null && String(s.id) === String(dim.id))) ||
      savedDimensions[index];
    const vw = Number(saved?.cw_air_freight);
    if (!Number.isFinite(vw) || vw <= 0) return dim;
    return { ...dim, cw_air_freight: vw };
  });
}
