import assert from "node:assert/strict";
import { test } from "node:test";
import { COLORS, DIMENSIONS, NAV, PRODUCTS, WORKSHOP } from "./content.ts";

test("the furniture collection has five uniquely identified local product images", () => {
  assert.equal(PRODUCTS.length, 5);
  assert.equal(new Set(PRODUCTS.map((product) => product.name)).size, 5);
  for (const product of PRODUCTS) {
    assert.match(product.image, /^\/forma\/[a-z]+\/photo\.webp$/);
    assert.match(product.price, /₼$/);
    assert.ok(product.alt.length > 0);
    assert.ok(product.detail.length > 0);
  }
});

test("sofa swatches and workshop chapters match the selected reference", () => {
  assert.deepEqual(COLORS.map((color) => color.name), ["Qum", "Zeytun", "Şokolad", "Qrafit"]);
  assert.deepEqual(WORKSHOP.map((chapter) => chapter.title), ["Taxta seçilir", "Kəsik açılır", "Karkas qurulur", "Parça gərilir"]);
});

test("navigation targets exist as rendered section ids and dimensions are labelled in cm", () => {
  assert.deepEqual(NAV.map((item) => item.href), ["#story", "#manifest", "#seq", "#col", "#end"]);
  for (const value of Object.values(DIMENSIONS)) assert.match(value, /^\d+ sm$/);
});
