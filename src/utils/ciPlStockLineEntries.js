import {
  parseCiPlDescriptionFromApi,
  parseCiPlMultiFieldLines,
  serializeCiPlMultiFieldLines,
} from "./ciPlDescriptionField";

let localEntryCounter = 0;

export function createEmptyCiplEntry() {
  localEntryCounter += 1;
  return {
    id: null,
    localKey: `local-${localEntryCounter}-${Date.now()}`,
    description: "",
    valueUsd: "",
    quantity: "",
    perUnit: "",
    deleted: false,
  };
}

export function normalizeCiplEntryValue(value) {
  if (value == null || value === false) return "";
  return String(value).trim();
}

export function getCiplActiveEntries(item) {
  return (Array.isArray(item?.entries) ? item.entries : []).filter((entry) => !entry?.deleted);
}

export function parseCiplStockLineEntriesFromApi(line, isPerUnit) {
  if (!line || typeof line !== "object") {
    return [createEmptyCiplEntry()];
  }

  const rawEntries = Array.isArray(line.entries) ? line.entries : [];
  const activeApiEntries = rawEntries.filter(
    (entry) => entry && !entry.delete && !entry._delete
  );

  if (activeApiEntries.length > 0) {
    return [...activeApiEntries]
      .sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0))
      .map((entry) => ({
        id:
          entry.id != null && Number.isFinite(Number(entry.id))
            ? Number(entry.id)
            : null,
        localKey:
          entry.id != null
            ? `e-${entry.id}`
            : createEmptyCiplEntry().localKey,
        description:
          entry.description != null && entry.description !== false
            ? String(entry.description)
            : "",
        valueUsd: normalizeCiplEntryValue(entry.value_in_usd),
        quantity: normalizeCiplEntryValue(entry.quantity_pcs ?? entry.quantity),
        perUnit: normalizeCiplEntryValue(entry.per_unit ?? entry.perunit),
        deleted: false,
      }));
  }

  if (
    line.description === false &&
    (isPerUnit
      ? line.quantity_pcs === false && line.per_unit === false
      : true)
  ) {
    return [createEmptyCiplEntry()];
  }

  const descriptionRaw =
    line.description != null && line.description !== false
      ? line.description
      : line.details != null && line.details !== false
        ? line.details
        : "";

  const parsedDesc = parseCiPlDescriptionFromApi(descriptionRaw);
  const descLines = parseCiPlMultiFieldLines(parsedDesc);
  const lineValueUsd = normalizeCiplEntryValue(
    line.value_in_usd != null && line.value_in_usd !== false
      ? line.value_in_usd
      : line.value_usd
  );
  const lineQty = normalizeCiplEntryValue(line.quantity_pcs ?? line.quantity);
  const linePerUnit = normalizeCiplEntryValue(line.per_unit ?? line.perunit);

  if (descLines.length <= 1) {
    return [
      {
        id: null,
        localKey: "e-legacy-0",
        description: descLines[0] ?? "",
        valueUsd: lineValueUsd,
        quantity: lineQty,
        perUnit: linePerUnit,
        deleted: false,
      },
    ];
  }

  return descLines.map((desc, idx) => ({
    id: null,
    localKey: `e-legacy-${idx}`,
    description: String(desc ?? ""),
    valueUsd: idx === 0 ? lineValueUsd : "",
    quantity: idx === 0 ? lineQty : "",
    perUnit: idx === 0 ? linePerUnit : "",
    deleted: false,
  }));
}

export function getCiplEntryValueUsd(entry, isPerUnit) {
  if (isPerUnit) {
    if (entry?.valueUsd != null && String(entry.valueUsd).trim() !== "") {
      const direct = Number(entry.valueUsd);
      return Number.isFinite(direct) ? direct : 0;
    }
    const q = Number(entry?.quantity);
    const p = Number(entry?.perUnit);
    if (Number.isFinite(q) && Number.isFinite(p)) return q * p;
    return 0;
  }
  const value = Number(String(entry?.valueUsd ?? "").trim());
  return Number.isFinite(value) ? value : 0;
}

export function getCiplStockLineValueUsd(item, isPerUnit) {
  const activeEntries = getCiplActiveEntries(item);
  if (activeEntries.length === 0) return 0;
  return activeEntries.reduce(
    (sum, entry) => sum + getCiplEntryValueUsd(entry, isPerUnit),
    0
  );
}

export function syncCiplStockLineSummaryFields(item, isPerUnit) {
  const activeEntries = getCiplActiveEntries(item);
  const valueSum = getCiplStockLineValueUsd(item, isPerUnit);
  const quantitySum = activeEntries.reduce((sum, entry) => {
    const qty = Number(entry.quantity);
    return sum + (Number.isFinite(qty) ? qty : 0);
  }, 0);

  return {
    ...item,
    details: activeEntries.map((entry) => entry.description).join("\x1e"),
    valueUsd:
      activeEntries.length === 1
        ? activeEntries[0].valueUsd
        : valueSum
          ? String(valueSum)
          : "",
    quantity:
      activeEntries.length === 1
        ? activeEntries[0].quantity
        : quantitySum
          ? String(quantitySum)
          : "",
    perUnit: activeEntries.length === 1 ? activeEntries[0].perUnit : "",
  };
}

const toNullIfEmpty = (value) => {
  const text = value == null ? "" : String(value).trim();
  return text === "" ? null : value;
};

/** Backward-compat top-level fields only for a single new entry with no server id. */
export function shouldUseLegacySingleFieldPayload(activeEntries, deletedEntries) {
  return (
    activeEntries.length === 1 &&
    deletedEntries.length === 0 &&
    !activeEntries[0]?.id
  );
}

function buildEntryDeletePayload(entry) {
  return { id: entry.id, delete: true };
}

export function buildCiplStockLinePayloadItem(item, isPerUnit) {
  const base = {
    ...(item?.lineId != null && Number.isFinite(Number(item.lineId))
      ? { id: Number(item.lineId) }
      : {}),
    ...(item?.stockListId != null && Number.isFinite(Number(item.stockListId))
      ? { stock_list_id: Number(item.stockListId) }
      : {}),
    ...(item?.stockItemId != null && String(item.stockItemId).trim() !== ""
      ? { stock_item_id: String(item.stockItemId) }
      : {}),
    warehouse_new: toNullIfEmpty(item?.warehouseId),
    dg_un: toNullIfEmpty(item?.dg_un),
    lwh: toNullIfEmpty(item?.lwh),
  };

  const allEntries = Array.isArray(item?.entries) ? item.entries : [];
  const activeEntries = allEntries.filter((entry) => !entry?.deleted);
  const deletedEntries = allEntries.filter((entry) => entry?.deleted && entry?.id);

  if (activeEntries.length === 0) {
    if (deletedEntries.length > 0) {
      return {
        ...base,
        entries: deletedEntries.map(buildEntryDeletePayload),
      };
    }
    return { ...base, entries: [] };
  }

  if (shouldUseLegacySingleFieldPayload(activeEntries, deletedEntries)) {
    const entry = activeEntries[0];
    return {
      ...base,
      description: toNullIfEmpty(entry.description),
      ...(isPerUnit
        ? {
          quantity_pcs: toNullIfEmpty(entry.quantity),
          per_unit: toNullIfEmpty(entry.perUnit),
        }
        : {
          value_in_usd: toNullIfEmpty(entry.valueUsd),
        }),
    };
  }

  const entriesPayload = [
    ...deletedEntries.map(buildEntryDeletePayload),
    ...activeEntries.map((entry) => ({
      ...(entry.id != null && Number.isFinite(Number(entry.id))
        ? { id: Number(entry.id) }
        : {}),
      description: toNullIfEmpty(entry.description),
      ...(isPerUnit
        ? {
          quantity_pcs: toNullIfEmpty(entry.quantity),
          per_unit: toNullIfEmpty(entry.perUnit),
        }
        : {
          value_in_usd: toNullIfEmpty(entry.valueUsd),
        }),
    })),
  ];

  return { ...base, entries: entriesPayload };
}

export function buildCiplStockLinePayload(items, isPerUnit) {
  return (Array.isArray(items) ? items : []).map((item) =>
    buildCiplStockLinePayloadItem(item, isPerUnit)
  );
}

export function mergeCiplStockLineFromApi(item, serverLine, isPerUnit) {
  if (!serverLine) return item;

  const entries = parseCiplStockLineEntriesFromApi(serverLine, isPerUnit);
  const lineId =
    serverLine.id != null && Number.isFinite(Number(serverLine.id))
      ? Number(serverLine.id)
      : item.lineId;

  return syncCiplStockLineSummaryFields(
    {
      ...item,
      lineId,
      entries,
    },
    isPerUnit
  );
}

export function getCiplPdfEntryRows(item, isPerUnit) {
  const activeEntries = getCiplActiveEntries(item);
  if (activeEntries.length > 0) {
    return activeEntries.map((entry) => ({
      description: entry.description,
      valueUsd: getCiplEntryValueUsd(entry, isPerUnit),
      quantity: entry.quantity,
      perUnit: entry.perUnit,
    }));
  }

  return [
    {
      description: item?.details ?? "",
      valueUsd: getCiplStockLineValueUsd(item, isPerUnit),
      quantity: item?.quantity ?? "",
      perUnit: item?.perUnit ?? "",
    },
  ];
}

export function ensureCargoItemEntries(item, isPerUnit) {
  const activeEntries = getCiplActiveEntries(item);
  if (activeEntries.length > 0) {
    return item.entries;
  }
  return parseCiplStockLineEntriesFromApi(
    {
      description: item?.details ?? "",
      value_in_usd: item?.valueUsd,
      quantity_pcs: item?.quantity,
      per_unit: item?.perUnit,
      entries: item?.entries,
    },
    isPerUnit
  );
}
