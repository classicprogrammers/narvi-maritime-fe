export const getApiErrorMessage = (error, fallback = "Something went wrong while saving.") => {
  if (error?.message && String(error.message).trim()) {
    return String(error.message);
  }
  const data = error?.response?.data;
  if (data?.result?.message) return String(data.result.message);
  if (data?.message) return String(data.message);
  if (typeof data?.result === "string" && data.result.trim()) return data.result;
  return fallback;
};

export const showFormSaveError = (toast, error, fallback) => {
  toast({
    title: "Error",
    description: getApiErrorMessage(error, fallback),
    status: "error",
    duration: 6000,
    isClosable: true,
  });
};
