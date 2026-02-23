export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-bg-secondary)" }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8 shadow-lg"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        {children}
      </div>
    </div>
  );
}
