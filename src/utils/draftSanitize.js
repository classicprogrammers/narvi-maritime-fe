const SECRET_KEYS = new Set([
  "password",
  "confirm_password",
  "new_password",
  "newPassword",
  "token",
]);
const MAX_STRING_LENGTH = 100000;

const isInstanceOf = (value, name) =>
  typeof window !== "undefined" && typeof window[name] === "function" && value instanceof window[name];

function isBinary(value) {
  return (
    isInstanceOf(value, "File") ||
    isInstanceOf(value, "Blob") ||
    isInstanceOf(value, "FileList") ||
    isInstanceOf(value, "ArrayBuffer") ||
    ArrayBuffer.isView(value)
  );
}

const joinKey = (path, key) => (path ? `${path}.${key}` : String(key));

/**
 * Pure, recursive, cycle-safe. Returns `{ value, stripped }` where `stripped` lists the paths that were
 * removed (files, base64 uploads, passwords, ...). Removed object keys / array items are omitted.
 * `undefined` and functions are dropped without being recorded (they are not user data).
 */
export function sanitizeDraftValue(input) {
  const stripped = [];
  const ancestors = new WeakSet();
  const DROP = Symbol("drop");

  const strip = (path) => {
    stripped.push(path || "(root)");
    return DROP;
  };

  const walk = (value, path) => {
    if (value === undefined || typeof value === "function") return DROP;
    if (value === null) return null;
    const type = typeof value;
    if (type === "symbol" || type === "bigint") return strip(path);
    if (type === "string") {
      if (value.startsWith("data:") || value.length > MAX_STRING_LENGTH) return strip(path);
      return value;
    }
    if (type !== "object") return value;

    if (value.$$typeof) return strip(path);
    if (isBinary(value)) return strip(path);
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? strip(path) : value.toISOString();
    }
    if (ancestors.has(value)) return strip(path);
    if (!(value instanceof Map) && !(value instanceof Set) && "datas" in value) return strip(path);

    ancestors.add(value);
    let out;
    if (Array.isArray(value) || value instanceof Set) {
      out = [];
      Array.from(value).forEach((item, index) => {
        const next = walk(item, `${path}[${index}]`);
        if (next !== DROP) out.push(next);
      });
    } else {
      const entries = value instanceof Map ? Array.from(value.entries()) : Object.entries(value);
      out = {};
      entries.forEach(([rawKey, item]) => {
        const key = String(rawKey);
        const childPath = joinKey(path, key);
        if (SECRET_KEYS.has(key)) {
          strip(childPath);
          return;
        }
        const next = walk(item, childPath);
        if (next !== DROP) out[key] = next;
      });
    }
    ancestors.delete(value);
    return out;
  };

  const result = walk(input, "");
  return { value: result === DROP ? null : result, stripped };
}
