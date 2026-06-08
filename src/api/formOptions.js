import api from "./axios";

const assertDeleteSuccess = (data) => {
  if (!data || typeof data !== "object") return data;
  if (data.status === "error" || data.result?.status === "error") {
    throw new Error(data.result?.message || data.message || "Failed to delete form option");
  }
  return data.result && typeof data.result === "object" ? data.result : data;
};

/** Delete a saved form dropdown option (PIC, from, to, shipped by, etc.). */
export const deleteFormOptionApi = async (
  deleteUrl = "/api/form/options/delete",
  { option_type, id } = {}
) => {
  if (!deleteUrl) throw new Error("options_delete_api is required");
  if (!option_type) throw new Error("option_type is required");
  if (id == null || id === "" || !Number.isFinite(Number(id))) {
    throw new Error("A numeric option id is required");
  }

  const response = await api.post(deleteUrl, {
    option_type: String(option_type),
    id: Number(id),
  });

  return assertDeleteSuccess(response.data);
};
