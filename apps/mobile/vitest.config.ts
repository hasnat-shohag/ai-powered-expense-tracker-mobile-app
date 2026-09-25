import { defineConfig } from "vitest/config";

/**
 * Vitest runs only the framework-free logic tests in this package — currency /
 * date formatting and amount parsing. Screen and DB code import React Native /
 * Expo native modules that don't load under Node, so those are covered by the
 * React Native Testing Library + Maestro suites on a device/CI (Phase 12/13),
 * not here. The include list is explicit so a future component test can't
 * silently join this Node run and fail on a native import.
 */
export default defineConfig({
  test: {
    include: ["src/format.test.ts", "src/lib/amount.test.ts"],
    environment: "node",
  },
});
