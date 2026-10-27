/**
 * Master Shipping Order (MSO) helpers.
 * An MSO is a shipping order with is_mso: true; vessel SOs link to it via mso_id (the MSO's id, not its so_id).
 */

export function isMsoOrder(order) {
  const value = order?.is_mso;
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

/** mso_id may arrive as an id, an Odoo [id, name] pair, an {id, name} object, or false/empty. */
export function getMsoId(order) {
  const value = order?.mso_id;
  if (value == null || value === false || value === "") return null;
  if (Array.isArray(value)) return value.length ? getMsoId({ mso_id: value[0] }) : null;
  if (typeof value === "object") return getMsoId({ mso_id: value.id });
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function getMsoName(order) {
  const value = order?.mso_id;
  if (Array.isArray(value) && value.length > 1 && value[1]) return String(value[1]);
  if (value && typeof value === "object" && !Array.isArray(value) && value.name) return String(value.name);
  if (order?.mso_name) return String(order.mso_name);
  const id = getMsoId(order);
  return id != null ? `MSO #${id}` : "";
}

export function getShippingOrderNumber(order) {
  if (order?.so_number) return order.so_number;
  if (order?.name) return order.name;
  return order?.id ? `SO-${order.id}` : "-";
}

/** Update payload to link a vessel SO to an MSO, or unlink it when msoId is empty. */
export function buildMsoLinkPayload(msoId) {
  const numeric = Number(msoId);
  return { mso_id: msoId != null && msoId !== "" && Number.isFinite(numeric) ? numeric : null };
}

/** Backend validation errors come back as { status: "error", message } (top level or under result). */
export function getMsoApiError(response) {
  const data = response?.result && typeof response.result === "object" ? response.result : response;
  if (data?.status === "error") return data.message || "Request failed";
  if (response?.status === "error") return response.message || "Request failed";
  return "";
}

/** Vessel SOs that can be added to an MSO: not an MSO themselves and not already in this MSO. */
export function filterLinkableOrders(orders = [], msoId) {
  if (!Array.isArray(orders)) return [];
  return orders.filter((order) => {
    if (!order || order.id == null) return false;
    if (isMsoOrder(order)) return false;
    if (Number(order.id) === Number(msoId)) return false;
    return getMsoId(order) !== Number(msoId);
  });
}
