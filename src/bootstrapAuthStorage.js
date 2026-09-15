import { persistScopedAuthOnBoot } from "./utils/authStorage";

try {
  persistScopedAuthOnBoot();
  sessionStorage.clear();
} catch (_) {}
