import test from "node:test";
import assert from "node:assert/strict";
import { getSafeString } from "../translate.js";

test("getSafeString - Normal string values", () => {
  assert.equal(getSafeString("Paracetamol 500mg"), "Paracetamol 500mg");
  assert.equal(getSafeString(""), "");
});

test("getSafeString - Localized {en: ...} objects", () => {
  assert.equal(getSafeString({ en: "Dolo 650mg" }), "Dolo 650mg");
  assert.equal(getSafeString({ en: "AstraZeneca" }), "AstraZeneca");
});

test("getSafeString - Nested localized objects", () => {
  assert.equal(getSafeString({ en: { en: "Nested Brand" } }), "Nested Brand");
});

test("getSafeString - Fallback to other language or default key when en is missing", () => {
  assert.equal(getSafeString({ default: "Healthcare Essentials" }), "Healthcare Essentials");
  assert.equal(getSafeString({ de: "Schmerzmittel" }), "Schmerzmittel");
  assert.equal(getSafeString({ name: "Medicine Category" }), "Medicine Category");
});

test("getSafeString - Null and undefined values", () => {
  assert.equal(getSafeString(null), "");
  assert.equal(getSafeString(undefined), "");
  assert.equal(getSafeString(null, null, "Fallback"), "Fallback");
  assert.equal(getSafeString(undefined, null, "Default"), "Default");
});

test("getSafeString - Numbers and booleans", () => {
  assert.equal(getSafeString(100), "100");
  assert.equal(getSafeString(0), "0");
  assert.equal(getSafeString(true), "true");
  assert.equal(getSafeString(false), "false");
});

test("getSafeString - Unexpected empty or nested object structures", () => {
  assert.equal(getSafeString({}), "");
  assert.equal(getSafeString({}, null, "Unknown"), "Unknown");
  assert.equal(getSafeString({ unknownKey: {} }), "");
});

test("getSafeString - Regression: exact production failure (Minified React error #31)", () => {
  // In production, the MongoDB product had title = { en: "Dolo 500 mg" }
  // React threw: object with keys {en}
  const brokenProduct = {
    _id: "66123456789",
    title: { en: "Dolo 500 mg" },
    category: { name: { en: "Healthcare Essentials" } },
    brand: { name: { en: "AstraZeneca" } },
    prices: { price: 35.2, originalPrice: 40 }
  };

  // Must guarantee a primitive string that React can render as a child
  const safeTitle = getSafeString(brokenProduct.title);
  const safeCategory = getSafeString(brokenProduct.category.name);
  const safeBrand = getSafeString(brokenProduct.brand.name);

  assert.equal(typeof safeTitle, "string");
  assert.equal(safeTitle, "Dolo 500 mg");
  assert.equal(typeof safeCategory, "string");
  assert.equal(safeCategory, "Healthcare Essentials");
  assert.equal(typeof safeBrand, "string");
  assert.equal(safeBrand, "AstraZeneca");
});
