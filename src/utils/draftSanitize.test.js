import { sanitizeDraftValue } from "./draftSanitize";

describe("sanitizeDraftValue", () => {
  test("keeps plain data untouched", () => {
    const input = { a: 1, b: "x", c: [1, { d: null }], e: true };
    const { value, stripped } = sanitizeDraftValue(input);
    expect(value).toEqual(input);
    expect(stripped).toEqual([]);
  });

  test("strips File and Blob values and records paths", () => {
    const { value, stripped } = sanitizeDraftValue({
      keep: 1,
      file: new File(["a"], "a.txt"),
      list: [new Blob(["b"]), "ok"],
    });
    expect(value).toEqual({ keep: 1, list: ["ok"] });
    expect(stripped).toEqual(["file", "list[0]"]);
  });

  test("strips binary buffers, functions, undefined and React elements", () => {
    const { value, stripped } = sanitizeDraftValue({
      buf: new ArrayBuffer(4),
      typed: new Uint8Array(2),
      fn: () => 1,
      u: undefined,
      el: { $$typeof: Symbol.for("react.element"), type: "div" },
      ok: "yes",
    });
    expect(value).toEqual({ ok: "yes" });
    expect(stripped).toEqual(["buf", "typed", "el"]);
  });

  test("strips objects with a datas property", () => {
    const { value, stripped } = sanitizeDraftValue({
      attachments: [
        { filename: "a.pdf", mimetype: "application/pdf", datas: "QUJD" },
        { filename: "meta-only", id: 3 },
      ],
    });
    expect(value).toEqual({ attachments: [{ filename: "meta-only", id: 3 }] });
    expect(stripped).toEqual(["attachments[0]"]);
  });

  test("strips data: strings and strings over 100000 chars", () => {
    const { value, stripped } = sanitizeDraftValue({
      img: "data:image/png;base64,AAAA",
      huge: "x".repeat(100001),
      fine: "x".repeat(100000),
    });
    expect(Object.keys(value)).toEqual(["fine"]);
    expect(stripped).toEqual(["img", "huge"]);
  });

  test("strips password and token keys at any depth", () => {
    const { value, stripped } = sanitizeDraftValue({
      name: "n",
      password: "p",
      confirm_password: "p",
      new_password: "p",
      newPassword: "p",
      token: "t",
      nested: { rows: [{ password: "p", email: "e" }] },
    });
    expect(value).toEqual({ name: "n", nested: { rows: [{ email: "e" }] } });
    expect(stripped).toEqual([
      "password",
      "confirm_password",
      "new_password",
      "newPassword",
      "token",
      "nested.rows[0].password",
    ]);
  });

  test("handles circular references without throwing", () => {
    const a = { name: "a" };
    a.self = a;
    a.list = [a];
    const { value, stripped } = sanitizeDraftValue(a);
    expect(value).toEqual({ name: "a", list: [] });
    expect(stripped).toEqual(["self", "list[0]"]);
    expect(() => JSON.stringify(value)).not.toThrow();
  });

  test("a shared (non-circular) reference is kept in both places", () => {
    const shared = { x: 1 };
    const { value, stripped } = sanitizeDraftValue({ a: shared, b: shared });
    expect(value).toEqual({ a: { x: 1 }, b: { x: 1 } });
    expect(stripped).toEqual([]);
  });

  test("converts Date, Set and Map", () => {
    const { value, stripped } = sanitizeDraftValue({
      d: new Date("2026-01-02T03:04:05.000Z"),
      s: new Set([1, 2]),
      m: new Map([
        ["a", 1],
        ["b", new Set(["z"])],
      ]),
    });
    expect(value).toEqual({
      d: "2026-01-02T03:04:05.000Z",
      s: [1, 2],
      m: { a: 1, b: ["z"] },
    });
    expect(stripped).toEqual([]);
  });

  test("drops an invalid Date and records it", () => {
    const { value, stripped } = sanitizeDraftValue({ d: new Date("nope") });
    expect(value).toEqual({});
    expect(stripped).toEqual(["d"]);
  });

  test("a droppable root returns null", () => {
    expect(sanitizeDraftValue(new File(["a"], "a.txt"))).toEqual({
      value: null,
      stripped: ["(root)"],
    });
  });
});
