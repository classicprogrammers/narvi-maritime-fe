jest.mock("jspdf", () => ({ jsPDF: jest.fn() }));
jest.mock("jspdf-autotable", () => ({ __esModule: true, default: jest.fn() }));

import { hasCjk, wrapTextLines } from "./pdfCjkText";

describe("pdfCjkText", () => {
  test("detects Chinese, Japanese and Korean text only", () => {
    expect(hasCjk("地址:湛江市")).toBe(true);
    expect(hasCjk("袁浩 EVA轮Room 106")).toBe(true);
    expect(hasCjk("Room 106, Office Building 1")).toBe(false);
    expect(hasCjk("")).toBe(false);
    expect(hasCjk(null)).toBe(false);
  });

  test("wraps per character for Chinese and at spaces for Latin words", () => {
    const measure = (t) => t.length * 10;
    expect(wrapTextLines("一二三四五", 30, measure)).toEqual(["一二三", "四五"]);
    expect(wrapTextLines("abc def ghi", 70, measure)).toEqual(["abc def", "ghi"]);
    expect(wrapTextLines("", 30, measure)).toEqual([""]);
  });
});

describe("autoTableCjk", () => {
  test("passes tables without CJK straight to autoTable", () => {
    const autoTable = require("jspdf-autotable").default;
    const { autoTableCjk } = require("./pdfCjkText");
    const doc = {};
    const options = { head: [["A"]], body: [["Room 106"]] };
    autoTableCjk(doc, options);
    expect(autoTable).toHaveBeenCalledWith(doc, options);
  });
});
