const DEFAULT_DELETABLE_TYPES = [
  "deliver_to_at",
  "delivery_to_at",
  "from",
  "location",
  "pic",
  "ship_by",
  "shipped_by",
  "to",
];

const FIELD_DELETE_TYPE_CANDIDATES = {
  pic: ["pic"],
  from: ["from"],
  to: ["to", "location"],
  shippedBy: ["shipped_by", "ship_by"],
  deliveryToAt: ["delivery_to_at", "deliver_to_at"],
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
    optionsUpdateApi:
      source?.options_update_api ||
      result?.options_update_api ||
      data?.options_update_api ||
      "/api/form/options/update",
    deletableOptionTypes: Array.isArray(source?.deletable_option_types)
      ? source.deletable_option_types
      : Array.isArray(result?.deletable_option_types)
        ? result.deletable_option_types
        : DEFAULT_DELETABLE_TYPES,
    updatableOptionTypes: Array.isArray(source?.updatable_option_types)
      ? source.updatable_option_types
      : Array.isArray(result?.updatable_option_types)
        ? result.updatable_option_types
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

export const resolveUpdateOptionType = (fieldKey, updatableTypes = DEFAULT_DELETABLE_TYPES) => {
  const candidates = FIELD_DELETE_TYPE_CANDIDATES[fieldKey] || [];
  return candidates.find((type) => updatableTypes.includes(type)) || candidates[0] || null;
};

export const canUpdateFormOption = (option, optionType, updatableTypes = DEFAULT_DELETABLE_TYPES) => {
  if (!optionType || !updatableTypes.includes(optionType)) return false;
  const id = option?.id;
  return id != null && id !== "" && Number.isFinite(Number(id));
};

export const canDeleteFormOption = (option, optionType, deletableTypes = DEFAULT_DELETABLE_TYPES) => {
  if (!optionType || !deletableTypes.includes(optionType)) return false;
  const id = option?.id;
  return id != null && id !== "" && Number.isFinite(Number(id));
};
