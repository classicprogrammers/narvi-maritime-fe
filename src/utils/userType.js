export const normalizeUserType = (userType) => {
  if (userType === false || userType === "false") return false;
  if (userType == null || userType === "") return null;
  return String(userType).trim().toLowerCase();
};

export const isClientUserType = (userType) => {
  const normalized = normalizeUserType(userType);
  return normalized === false || normalized === "client";
};

export const isStaffUserType = (userType) => {
  const normalized = normalizeUserType(userType);
  return normalized === "admin" || normalized === "user";
};

export const resolveStoredUserType = (userType, fallback) => {
  if (userType === false || userType === "false") return false;
  if (userType == null || userType === "") return fallback;
  return userType;
};

export const getHomePathForUserType = (userType) =>
  isClientUserType(userType) ? "/Client/Vessels" : "/admin/default";
