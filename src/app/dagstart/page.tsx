import { Suspense } from "react";

import DagstartV2Client from "@/components/v2/DagstartV2Client";

export default function DagstartPage() {
  return (
    <Suspense>
      <DagstartV2Client />
    </Suspense>
  );
}
