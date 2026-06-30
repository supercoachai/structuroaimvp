type ExceptionFrame = {
  in_app?: boolean;
  source?: string;
  filename?: string;
};

type ExceptionEntry = {
  type?: string;
  value?: string;
  stacktrace?: { frames?: ExceptionFrame[] };
};

function getExceptionList(properties: Record<string, unknown>): ExceptionEntry[] {
  const list = properties.$exception_list;
  if (!Array.isArray(list)) return [];
  return list as ExceptionEntry[];
}

function getExceptionMessages(properties: Record<string, unknown>): string[] {
  const values = properties.$exception_values;
  if (Array.isArray(values)) {
    return values.filter((value): value is string => typeof value === "string");
  }
  return getExceptionList(properties)
    .map((entry) => entry.value)
    .filter((value): value is string => typeof value === "string");
}

function hasInAppFrame(properties: Record<string, unknown>): boolean {
  for (const entry of getExceptionList(properties)) {
    const frames = entry.stacktrace?.frames ?? [];
    if (frames.some((frame) => frame.in_app === true)) return true;
  }
  return false;
}

function frameSource(frame: ExceptionFrame): string {
  return `${frame.source ?? ""} ${frame.filename ?? ""}`.trim();
}

function isPosthogRecorderOnlyException(properties: Record<string, unknown>): boolean {
  const inAppSources: string[] = [];
  for (const entry of getExceptionList(properties)) {
    for (const frame of entry.stacktrace?.frames ?? []) {
      if (frame.in_app !== true) continue;
      inAppSources.push(frameSource(frame));
    }
  }
  if (inAppSources.length === 0) return false;
  return inAppSources.every((source) =>
    /posthog|rrweb|session-recording|external-scripts-loader|lazy-loaded-session-recorder|array\.js|posthog-recorder\.js/i.test(
      source
    )
  );
}

/** Drop unactionable browser/host-bridge/replay noise before it becomes an issue. */
export function shouldDropNoiseException(
  properties: Record<string, unknown>
): boolean {
  const messages = getExceptionMessages(properties);

  if (
    messages.some((message) =>
      /Java object is gone|Error invoking postMessage/i.test(message)
    )
  ) {
    return true;
  }

  if (
    messages.some((message) => message.trim() === "Script error.") &&
    !hasInAppFrame(properties)
  ) {
    return true;
  }

  if (
    messages.some((message) =>
      /Object Not Found Matching Id:\d+.*MethodName:update.*ParamCount:/i.test(
        message
      )
    ) &&
    !hasInAppFrame(properties)
  ) {
    return true;
  }

  const types = properties.$exception_types;
  const isSecurityError =
    (Array.isArray(types) && types.includes("DOMException")) ||
    messages.some((message) => /SecurityError.*insecure/i.test(message));

  if (isSecurityError && isPosthogRecorderOnlyException(properties)) {
    return true;
  }

  return false;
}
