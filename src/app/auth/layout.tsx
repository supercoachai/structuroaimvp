import "@/components/v2/structuro-tokens.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="v2-root min-h-[100dvh] flex flex-col">{children}</div>
  );
}
