/**
 * Zichtbare placeholder i.p.v. leeg/oud-grijs scherm tijdens shell- of route-laden.
 * Altijd cream + Structuro-logo; geen skeleton-tekst of "laden"-copy.
 */
import StructuroLogoLoading, {
  STRUCTURO_CREAM,
} from "@/components/structuro/StructuroLogoLoading";

export default function AppShellSuspenseFallback() {
  return (
    <div
      className="flex min-h-[100dvh] w-full flex-1 flex-col"
      style={{ backgroundColor: `var(--surface, ${STRUCTURO_CREAM})` }}
    >
      <StructuroLogoLoading
        fullScreen={false}
        className="flex-1 bg-transparent"
        size={72}
      />
    </div>
  );
}
