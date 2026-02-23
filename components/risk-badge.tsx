const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const RISK_LABELS: Record<string, string> = {
  low: "DUSUK",
  medium: "ORTA",
  high: "YUKSEK",
  critical: "KRITIK",
};

export function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
        RISK_STYLES[level] || "bg-gray-100 text-gray-800"
      }`}
    >
      {RISK_LABELS[level] || level.toUpperCase()}
    </span>
  );
}
