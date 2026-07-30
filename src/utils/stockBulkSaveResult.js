/** Parse bulk create/update API results (partial success + per-line errors). */

export function formatStockLineError(err) {
  if (!err || typeof err !== "object") return "Unknown error";
  const parts = [];
  if (err.index != null && err.index !== "") parts.push(`Row ${Number(err.index) + 1}`);
  if (err.stock_id != null && err.stock_id !== "") parts.push(`Stock #${err.stock_id}`);
  if (err.field) parts.push(String(err.field));
  const msg = err.message || "Unknown error";
  return parts.length ? `${parts.join(" · ")}: ${msg}` : msg;
}

export function getStockBulkSaveResultData(response) {
  return response?.result ?? response ?? null;
}

export function getStockBulkSaveErrors(resultData) {
  if (!resultData || !Array.isArray(resultData.errors)) return [];
  return resultData.errors.map(formatStockLineError);
}

export function hasStockBulkSaveErrors(resultData) {
  if (!resultData) return false;
  return (
    Number(resultData.error_count) > 0 ||
    (Array.isArray(resultData.errors) && resultData.errors.length > 0)
  );
}

export function getStockBulkSaveFailedStockIds(resultData) {
  if (!resultData || !Array.isArray(resultData.errors)) return new Set();
  return new Set(
    resultData.errors
      .map((err) => err?.stock_id)
      .filter((id) => id != null && id !== "")
      .map((id) => String(id))
  );
}

export function getStockBulkSaveFailedIndices(resultData) {
  if (!resultData || !Array.isArray(resultData.errors)) return new Set();
  return new Set(
    resultData.errors
      .map((err) => err?.index)
      .filter((index) => index != null && index !== "" && !Number.isNaN(Number(index)))
      .map((index) => Number(index))
  );
}

/** After partial bulk save, keep only rows that failed (match stock_id or API line index). */
export function filterRowsWithBulkSaveFailures(
  rows,
  resultData,
  { getRowId = (row) => row?.stockId ?? row?.stock_id ?? row?.id } = {}
) {
  if (!hasStockBulkSaveErrors(resultData) || !Array.isArray(rows)) return rows;
  const failedIds = getStockBulkSaveFailedStockIds(resultData);
  const failedIndices = getStockBulkSaveFailedIndices(resultData);
  if (failedIds.size === 0 && failedIndices.size === 0) return rows;
  return rows.filter((row, index) => {
    const rowId = getRowId(row);
    if (rowId != null && rowId !== "" && failedIds.has(String(rowId))) return true;
    return failedIndices.has(index);
  });
}

/** Filter source stock items to those that failed bulk save. */
export function filterItemsWithBulkSaveFailures(
  items,
  resultData,
  { getItemId = (item) => item?.id ?? item?.stock_id } = {}
) {
  if (!hasStockBulkSaveErrors(resultData) || !Array.isArray(items)) return items;
  const failedIds = getStockBulkSaveFailedStockIds(resultData);
  const failedIndices = getStockBulkSaveFailedIndices(resultData);
  if (failedIds.size === 0 && failedIndices.size === 0) return items;
  return items.filter((item, index) => {
    const itemId = getItemId(item);
    if (itemId != null && itemId !== "" && failedIds.has(String(itemId))) return true;
    return failedIndices.has(index);
  });
}

export function getStockBulkSaveSummary(resultData, fallback = "") {
  return (resultData?.message && String(resultData.message).trim()) || fallback;
}

/**
 * Show summary + per-line error toasts for stock bulk create/update responses.
 * Returns { partialSuccess, allFailed, failedStockIds }.
 */
export function showStockBulkSaveToasts(resultData, toast, { fallbackSummary = "" } = {}) {
  const summary = getStockBulkSaveSummary(resultData, fallbackSummary);
  const errors = getStockBulkSaveErrors(resultData);
  const hasErrors = hasStockBulkSaveErrors(resultData);
  const failedStockIds = getStockBulkSaveFailedStockIds(resultData);
  const savedCount = Number(resultData?.updated_count ?? resultData?.created_count ?? 0);
  const partialSuccess = hasErrors && savedCount > 0;

  if (!hasErrors) {
    toast({
      title: "Success",
      description: summary || fallbackSummary || "Stock saved successfully",
      status: "success",
      duration: 4000,
      isClosable: true,
    });
    return { partialSuccess: false, allFailed: false, failedStockIds };
  }

  if (partialSuccess) {
    toast({
      title: "Partially saved",
      description: summary || `${savedCount} item(s) saved with errors`,
      status: "warning",
      duration: 6000,
      isClosable: true,
    });
  } else {
    toast({
      title: "Save failed",
      description: summary || "Failed to save stock",
      status: "error",
      duration: 6000,
      isClosable: true,
    });
  }

  if (errors.length > 0) {
    toast({
      title: partialSuccess ? "Some rows could not be saved" : "Errors",
      description: errors.join("\n"),
      status: "error",
      duration: 12000,
      isClosable: true,
    });
  }

  return {
    partialSuccess,
    allFailed: savedCount === 0,
    failedStockIds,
  };
}
