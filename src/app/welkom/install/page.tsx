import { Suspense } from "react";

import InstallV2Client from "@/components/v2/InstallV2Client";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";

/** Canonieke install-route (livePaths.install). Legacy /v2/install redirect hierheen. */
export default function WelkomInstallPage() {
  return (
    <Suspense fallback={<StructuroLogoLoading />}>
      <InstallV2Client />
    </Suspense>
  );
}
