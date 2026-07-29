import { Suspense } from "react";

import StopAbonnementV2Client from "@/components/v2/StopAbonnementV2Client";

export default function StopAbonnementPage() {
  return (
    <Suspense fallback={null}>
      <StopAbonnementV2Client />
    </Suspense>
  );
}
