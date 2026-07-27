/** Stock list create/update is restricted to admin users (`user_type === "admin"`). */
export function canEditStockList(user) {
  return Boolean(user && user.user_type === "admin");
}
