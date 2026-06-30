(function () {
  function getExceptionList(properties) {
    var list = properties && properties.$exception_list;
    return Array.isArray(list) ? list : [];
  }

  function getExceptionMessages(properties) {
    var values = properties && properties.$exception_values;
    if (Array.isArray(values)) {
      return values.filter(function (value) {
        return typeof value === "string";
      });
    }
    return getExceptionList(properties)
      .map(function (entry) {
        return entry && entry.value;
      })
      .filter(function (value) {
        return typeof value === "string";
      });
  }

  function hasInAppFrame(properties) {
    var entries = getExceptionList(properties);
    for (var i = 0; i < entries.length; i++) {
      var frames = (entries[i].stacktrace && entries[i].stacktrace.frames) || [];
      for (var j = 0; j < frames.length; j++) {
        if (frames[j] && frames[j].in_app === true) return true;
      }
    }
    return false;
  }

  function frameSource(frame) {
    return String((frame && frame.source) || "") + " " + String((frame && frame.filename) || "");
  }

  function isPosthogRecorderOnlyException(properties) {
    var inAppSources = [];
    var entries = getExceptionList(properties);
    for (var i = 0; i < entries.length; i++) {
      var frames = (entries[i].stacktrace && entries[i].stacktrace.frames) || [];
      for (var j = 0; j < frames.length; j++) {
        if (!frames[j] || frames[j].in_app !== true) continue;
        inAppSources.push(frameSource(frames[j]));
      }
    }
    if (!inAppSources.length) return false;
    return inAppSources.every(function (source) {
      return /posthog|rrweb|session-recording|external-scripts-loader|lazy-loaded-session-recorder|array\.js|posthog-recorder\.js/i.test(
        source
      );
    });
  }

  function shouldDropNoiseException(properties) {
    if (!properties || typeof properties !== "object") return false;
    var messages = getExceptionMessages(properties);

    for (var i = 0; i < messages.length; i++) {
      if (/Java object is gone|Error invoking postMessage/i.test(messages[i])) return true;
    }

    for (var j = 0; j < messages.length; j++) {
      if (messages[j].trim() === "Script error." && !hasInAppFrame(properties)) return true;
    }

    for (var k = 0; k < messages.length; k++) {
      if (
        /Object Not Found Matching Id:\d+.*MethodName:update.*ParamCount:/i.test(messages[k]) &&
        !hasInAppFrame(properties)
      ) {
        return true;
      }
    }

    var types = properties.$exception_types;
    var isSecurityError =
      (Array.isArray(types) && types.indexOf("DOMException") !== -1) ||
      messages.some(function (message) {
        return /SecurityError.*insecure/i.test(message);
      });

    if (isSecurityError && isPosthogRecorderOnlyException(properties)) return true;
    return false;
  }

  window.structuroPhBeforeSend = function (cr) {
    if (!cr || !cr.properties || typeof cr.properties !== "object") return cr;
    if (cr.event === "$exception" && shouldDropNoiseException(cr.properties)) return null;
    return cr;
  };
})();
