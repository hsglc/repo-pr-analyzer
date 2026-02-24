const RISK_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const RISK_LABELS: Record<string, string> = {
  low: "DÜŞÜK",
  medium: "ORTA",
  high: "YÜKSEK",
  critical: "KRİTİK",
};

export function RiskBadge({ level }: { level: string }) {
  const isCritical = level === "critical";

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
        RISK_STYLES[level] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      } ${isCritical ? "animate-pulse-critical" : ""}`}
    >
      {RISK_LABELS[level] || level.toUpperCase()}
    </span>
  );
}
