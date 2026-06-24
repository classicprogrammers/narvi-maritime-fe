const resolveMasterFieldApiKeys = (fieldKey, variant = "si") => {
  switch (fieldKey) {
    case "shippedBy":
      return { textKey: "to_be_shipped_by", idKey: "si_shipped_by_id" };
    case "from":
      return { textKey: "from_text", idKey: "siform_from_id" };
    case "to":
      return variant === "advise"
        ? { textKey: "destination_text", idKey: "siform_to_id" }
        : { textKey: "to_text", idKey: "siform_to_id" };
    case "pic":
      return { textKey: "header_pic", idKey: "header_pic_id" };
    case "location":
      return { textKey: "location_text", idKey: "siform_to_id" };
    case "deliveryToAt":
      return { textKey: "delivery_to_at", idKey: "delivery_to_at_id" };
    default:
      return null;
  }
};

export const normalizeMasterOptionId = (value) => {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

export const findMasterOptionByName = (options, name) => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return (
    options.find((option) => String(option?.name ?? "").trim().toLowerCase() === lower) || null
  );
};

/**
 * Build shipped-by / from / to fields for form update APIs.
 *
 * - New text → text only (id field omitted so backend creates master).
 * - Existing option selected → stored id + text.
 * - Existing option + edited text → same id + new text (backend renames master).
 * - Text matches another existing option → re-link to that option's id.
 */
export const buildMasterOptionFormSaveFields = ({
  fieldKey,
  text,
  selectedId,
  savedId,
  options = [],
  forceNew = false,
  variant = "si",
}) => {
  const keys = resolveMasterFieldApiKeys(fieldKey, variant);
  if (!keys) return {};

  const trimmedText = String(text ?? "").trim();
  const textValue = trimmedText === "" ? null : trimmedText;
  const selectedIdNorm = normalizeMasterOptionId(selectedId);
  const savedIdNorm = normalizeMasterOptionId(savedId);
  const { textKey, idKey } = keys;

  if (!textValue) {
    return { [textKey]: null, [idKey]: null };
  }

  const match = findMasterOptionByName(options, textValue);
  const matchId = normalizeMasterOptionId(match?.id);
  if (matchId != null) {
    return {
      [textKey]: String(match.name),
      [idKey]: matchId,
    };
  }

  if (!forceNew && selectedIdNorm != null) {
    return {
      [textKey]: textValue,
      [idKey]: selectedIdNorm,
    };
  }

  if (!forceNew && savedIdNorm != null) {
    return {
      [textKey]: textValue,
      [idKey]: savedIdNorm,
    };
  }

  return {
    [textKey]: textValue,
  };
};

export const buildHeaderMasterOptionFields = ({
  data,
  savedHeader = {},
  shippedByOptions = [],
  fromOptions = [],
  toOptions = [],
  picOptions = [],
  deliveryToAtOptions = [],
  variant = "si",
  fields = ["shippedBy", "from", "to"],
}) => {
  const result = {};

  if (fields.includes("shippedBy")) {
    Object.assign(result, buildMasterOptionFormSaveFields({
      fieldKey: "shippedBy",
      text: data.shippedBy,
      selectedId: data.shippedById,
      savedId: savedHeader.si_shipped_by_id,
      options: shippedByOptions,
      variant,
    }));
  }

  if (fields.includes("from")) {
    Object.assign(result, buildMasterOptionFormSaveFields({
      fieldKey: "from",
      text: data.from,
      selectedId: data.fromId,
      savedId: savedHeader.siform_from_id,
      options: fromOptions,
      variant,
    }));
  }

  if (fields.includes("to")) {
    Object.assign(result, buildMasterOptionFormSaveFields({
      fieldKey: "to",
      text: data.to,
      selectedId: data.toId,
      savedId: savedHeader.siform_to_id,
      options: toOptions,
      variant,
    }));
  }

  if (fields.includes("pic")) {
    Object.assign(result, buildMasterOptionFormSaveFields({
      fieldKey: "pic",
      text: data.picName,
      selectedId: data.pic,
      savedId: savedHeader.header_pic_id,
      options: picOptions,
      variant,
    }));
  }

  if (fields.includes("location")) {
    Object.assign(result, buildMasterOptionFormSaveFields({
      fieldKey: "location",
      text: data.to,
      selectedId: data.toId,
      savedId: savedHeader.siform_to_id,
      options: toOptions,
      variant,
    }));
  }

  if (fields.includes("deliveryToAt")) {
    Object.assign(result, buildMasterOptionFormSaveFields({
      fieldKey: "deliveryToAt",
      text: data.deliveryToAt,
      selectedId: data.deliveryToAtId,
      savedId: savedHeader.delivery_to_at_id,
      options: deliveryToAtOptions,
      variant,
    }));
  }

  return result;
};

/** @deprecated Use buildHeaderMasterOptionFields */
export const buildSiHeaderMasterOptionFields = (params) =>
  buildHeaderMasterOptionFields({ ...params, variant: "si" });
