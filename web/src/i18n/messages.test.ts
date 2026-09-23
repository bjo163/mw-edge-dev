import assert from "node:assert/strict";
import test from "node:test";

import { isLocale, message, resolveLocale } from "./messages.js";

test("shared chrome messages render in English and Indonesian", () => {
  assert.equal(message("en", "action.retry"), "Retry");
  assert.equal(message("id", "action.retry"), "Coba lagi");
  assert.equal(message("en", "state.permissionDenied.title"), "Permission denied");
  assert.equal(message("id", "state.permissionDenied.title"), "Akses ditolak");
});

test("locale validation accepts only supported locale identifiers", () => {
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("id"), true);
  assert.equal(isLocale("id-ID"), false);
  assert.equal(isLocale(undefined), false);
});

test("explicit supported locale wins and unsupported values fall back deterministically", () => {
  assert.equal(resolveLocale("id"), "id");
  assert.equal(resolveLocale("en"), "en");

  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { language: "en-US" },
  });

  try {
    assert.equal(resolveLocale("fr"), "en");
    assert.equal(resolveLocale(null), "en");
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
  }
});

test("browser Indonesian preference is used only when no supported locale is explicit", () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { language: "id-ID" },
  });

  try {
    assert.equal(resolveLocale(undefined), "id");
    assert.equal(resolveLocale("en"), "en");
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
  }
});
