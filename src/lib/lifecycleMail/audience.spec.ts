import { afterEach, describe, expect, it } from "vitest";

import {
  lifecycleMailSendsEnabled,
  resolveLifecycleMailAudience,
} from "./audience";

describe("lifecycleMail audience", () => {
  const prevAudience = process.env.LIFECYCLE_MAIL_AUDIENCE;
  const prevEnabled = process.env.LIFECYCLE_MAIL_ENABLED;

  afterEach(() => {
    if (prevAudience === undefined) delete process.env.LIFECYCLE_MAIL_AUDIENCE;
    else process.env.LIFECYCLE_MAIL_AUDIENCE = prevAudience;
    if (prevEnabled === undefined) delete process.env.LIFECYCLE_MAIL_ENABLED;
    else process.env.LIFECYCLE_MAIL_ENABLED = prevEnabled;
  });

  it("default audience is off (v1 veilig)", () => {
    delete process.env.LIFECYCLE_MAIL_AUDIENCE;
    expect(resolveLifecycleMailAudience()).toBe("off");
  });

  it("sends disabled by default", () => {
    delete process.env.LIFECYCLE_MAIL_ENABLED;
    expect(lifecycleMailSendsEnabled()).toBe(false);
  });
});
