export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="noise-overlay relative flex min-h-screen items-center justify-center px-4 overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)",
      }}
    >
      {/* Animated floating orbs */}
      <div
        className="auth-orb hidden sm:block"
        style={{
          width: 350,
          height: 350,
          top: "8%",
          left: "12%",
          background: "radial-gradient(circle, #3b82f6, transparent)",
          animationDelay: "0s",
        }}
      />
      <div
        className="auth-orb hidden sm:block"
        style={{
          width: 280,
          height: 280,
          bottom: "8%",
          right: "8%",
          background: "radial-gradient(circle, #7c3aed, transparent)",
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
          background: "radial-gradient(circle, #ec4899, transparent)",
          animationDelay: "4s",
          opacity: 0.15,
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="18" r="3"/>
              <circle cx="6" cy="6" r="3"/>
              <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
              <line x1="6" y1="9" x2="6" y2="21"/>
            </svg>
          </div>
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
