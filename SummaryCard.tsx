export default function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-card bg-maroon-800 text-ivory px-4 py-4 flex flex-col gap-1"
          : "rounded-card bg-white border border-clay-300/70 px-4 py-4 flex flex-col gap-1"
      }
    >
      <span className={accent ? "text-marigold-100/80 text-sm" : "text-maroon-700/70 text-sm"}>
        {label}
      </span>
      <span className="font-display font-700 text-2xl">{value}</span>
    </div>
  );
}
