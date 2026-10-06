const toClientId = (value) => {
  if (value == null || value === false || value === "") return null;
  if (Array.isArray(value)) return toClientId(value[0]);
  if (typeof value === "object") return toClientId(value.id);
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const toClientName = (value) => {
  if (value == null || value === false || value === "") return "";
  if (Array.isArray(value)) {
    const name = value.length > 1 ? value[1] : null;
    if (name != null && name !== false && String(name).trim()) return String(name).trim();
    return toClientName(value[0]);
  }
  if (typeof value === "object") {
    const name = value.name || value.label || value.display_name;
    return name != null && name !== false ? String(name).trim() : "";
  }
  const text = String(value).trim();
  return /^\d+$/.test(text) ? "" : text;
};

export function parseNamedClients(value) {
  if (value == null || value === false) return [];
  const list = Array.isArray(value) ? value : [value];
  const clients = [];
  const seen = new Set();
  list.forEach((item) => {
    const id = toClientId(item);
    if (id == null || seen.has(id)) return;
    seen.add(id);
    const name = toClientName(item);
    const clientCode =
      item && typeof item === "object" && !Array.isArray(item) && item.client_code
        ? String(item.client_code).trim()
        : "";
    clients.push({ id, name: name || `Client ${id}`, client_code: clientCode });
  });
  return clients;
}

export function extractClientsFromPayload(data) {
  const source =
    data?.result && typeof data.result === "object" && !Array.isArray(data.result)
      ? data.result
      : data || {};
  if (Array.isArray(source.clients) && source.clients.length) {
    return parseNamedClients(source.clients);
  }
  if (source.client && typeof source.client === "object") {
    return parseNamedClients([source.client]);
  }
  return [];
}

export function formatClientsHeading(clients) {
  const list = parseNamedClients(clients);
  if (!list.length) return "";
  if (list.length === 1) return list[0].name;
  if (list.length <= 3) return list.map((client) => client.name).join(", ");
  return `${list.length} clients`;
}

export function formatPortalClientOption(client) {
  if (!client) return "";
  const name = client.name || (client.id != null ? `Client ${client.id}` : "");
  const code = client.client_code ? String(client.client_code).trim() : "";
  return code ? `${name} (${code})` : name;
}

export function extractSelectedClient(data) {
  const source =
    data?.result && typeof data.result === "object" && !Array.isArray(data.result)
      ? data.result
      : data || {};
  if (!source.selected_client || source.selected_client === false) return null;
  return parseNamedClients([source.selected_client])[0] || null;
}

export function getRowClientName(row) {
  if (!row || typeof row !== "object") return "";
  const fromClient = toClientName(row.client);
  if (fromClient) return fromClient;
  const fromClientId = toClientName(row.client_id);
  if (fromClientId) return fromClientId;
  return toClientName(row.client_name);
}
