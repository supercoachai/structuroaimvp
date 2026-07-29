import { Suspense } from "react";

import DumpV2Client from "@/components/v2/DumpV2Client";

export default function V2DumpPage() {
  return (
    <Suspense>
      <DumpV2Client />
    </Suspense>
  );
}
