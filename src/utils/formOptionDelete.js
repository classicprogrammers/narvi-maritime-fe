const DEFAULT_DELETABLE_TYPES = ["from", "location", "pic", "ship_by", "shipped_by", "to"];

const FIELD_DELETE_TYPE_CANDIDATES = {
  pic: ["pic"],
  from: ["from"],
  to: ["to", "location"],
  shippedBy: ["shipped_by", "ship_by"],
};

export const parseFormOptionsMeta = (data) => {
  const result = data?.result && typeof data.result === "object" ? data.result : data;
  const source =
    result?.data && typeof result.data === "object"
      ? result.data
      : data?.data && typeof data.data === "object"
        ? data.data
        : result;

  return {
    optionsDeleteApi:
      source?.options_delete_api ||
      result?.options_delete_api ||
      data?.options_delete_api ||
      "/api/form/options/delete",
    deletableOptionTypes: Array.isArray(source?.deletable_option_types)
      ? source.deletable_option_types
      : Array.isArray(result?.deletable_option_types)
        ? result.deletable_option_types
        : DEFAULT_DELETABLE_TYPES,
    nonDeletableOptionTypes: Array.isArray(source?.non_deletable_option_types)
      ? source.non_deletable_option_types
      : [],
  };
};

export const resolveDeleteOptionType = (fieldKey, deletableTypes = DEFAULT_DELETABLE_TYPES) => {
  const candidates = FIELD_DELETE_TYPE_CANDIDATES[fieldKey] || [];
  return candidates.find((type) => deletableTypes.includes(type)) || candidates[0] || null;
};

export const canDeleteFormOption = (option, optionType, deletableTypes = DEFAULT_DELETABLE_TYPES) => {
  if (!optionType || !deletableTypes.includes(optionType)) return false;
  const id = option?.id;
  return id != null && id !== "" && Number.isFinite(Number(id));
};
