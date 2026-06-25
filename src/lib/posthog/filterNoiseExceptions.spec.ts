import { describe, expect, it } from "vitest";

import { shouldDropNoiseException } from "./filterNoiseExceptions";

describe("shouldDropNoiseException", () => {
  it("drops bare Script error without in-app frames", () => {
    expect(
      shouldDropNoiseException({
        $exception_values: ["Script error."],
        $exception_list: [],
      })
    ).toBe(true);
  });

  it("drops Java object is gone in-app browser noise", () => {
    expect(
      shouldDropNoiseException({
        $exception_values: ["Error invoking postMessage: Java object is gone"],
      })
    ).toBe(true);
  });

  it("drops rrweb SecurityError with only recorder frames", () => {
    expect(
      shouldDropNoiseException({
        $exception_types: ["DOMException"],
        $exception_values: ["SecurityError: The operation is insecure."],
        $exception_list: [
          {
            type: "DOMException",
            value: "SecurityError: The operation is insecure.",
            stacktrace: {
              frames: [
                {
                  in_app: true,
                  source: "../src/extensions/replay/session-recording.ts",
                },
                {
                  in_app: true,
                  source: "../../rrweb/record/dist/rrweb-record.js",
                },
              ],
            },
          },
        ],
      })
    ).toBe(true);
  });

  it("keeps genuine app exceptions", () => {
    expect(
      shouldDropNoiseException({
        $exception_values: ["TypeError: Cannot read properties of undefined"],
        $exception_list: [
          {
            stacktrace: {
              frames: [{ in_app: true, source: "src/components/HomeCalm.tsx" }],
            },
          },
        ],
      })
    ).toBe(false);
  });
});
