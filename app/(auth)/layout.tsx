export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      }}
    >
      {/* Animated floating orbs */}
      <div
        className="auth-orb hidden sm:block"
        style={{
          width: 300,
          height: 300,
          top: "10%",
          left: "15%",
          background: "#3b82f6",
          animationDelay: "0s",
        }}
      />
      <div
        className="auth-orb hidden sm:block"
        style={{
          width: 250,
          height: 250,
          bottom: "10%",
          right: "10%",
          background: "#7c3aed",
          animationDelay: "2s",
        }}
      />
      <div
        className="auth-orb hidden sm:block"
        style={{
          width: 200,
          height: 200,
          top: "50%",
          right: "30%",
          background: "#ec4899",
          animationDelay: "4s",
          opacity: 0.2,
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold sm:text-4xl"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            PIA
          </h1>
          <p className="mt-1 text-sm text-slate-400">PR Impact Analyzer</p>
        </div>

        {/* Glass card */}
        <div className="glass rounded-2xl p-5 shadow-2xl sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
