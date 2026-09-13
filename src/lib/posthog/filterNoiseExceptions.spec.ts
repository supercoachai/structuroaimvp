import { describe, expect, it } from "vitest";

import {
  isExpectedNextRequestError,
  shouldDropNoiseException,
} from "./filterNoiseExceptions";

describe("isExpectedNextRequestError", () => {
  it("drops stale Server Action POSTs after a redeploy", () => {
    expect(
      isExpectedNextRequestError(
        new Error(
          'Failed to find Server Action "abc123". This request might be from an older or newer deployment.'
        )
      )
    ).toBe(true);
  });

  it("drops the previous-deployment wording Next.js also uses", () => {
    expect(
      isExpectedNextRequestError(
        new Error(
          'Failed to find Server Action "x". This request might have come from a previous deployment.'
        )
      )
    ).toBe(true);
  });

  it("keeps genuine server errors", () => {
    expect(
      isExpectedNextRequestError(
        new Error("TypeError: Cannot read properties of undefined")
      )
    ).toBe(false);
  });
});

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

  it("drops browser-extension Object Not Found bridge rejections without in-app frames", () => {
    expect(
      shouldDropNoiseException({
        $exception_values: [
          "UnhandledRejection: Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4",
        ],
        $exception_list: [],
      })
    ).toBe(true);
  });

  it("keeps Object Not Found when in-app frames are present", () => {
    expect(
      shouldDropNoiseException({
        $exception_values: [
          "Object Not Found Matching Id:1, MethodName:update, ParamCount:4",
        ],
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

  it("drops Server Action mismatch if it lands as a captured exception", () => {
    expect(
      shouldDropNoiseException({
        $exception_values: [
          'Failed to find Server Action "abc123". This request might be from an older or newer deployment.',
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
