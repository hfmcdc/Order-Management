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
          ? "rounded-[22px] bg-gradient-to-br from-maroon-800 to-maroon-900 text-ivory px-5 py-5 flex flex-col gap-1.5 shadow-lg shadow-maroon-900/20"
          : "card px-5 py-5 flex flex-col gap-1.5"
      }
    >
      <span className={accent ? "text-marigold-100/80 text-[13px]" : "text-maroon-700/60 text-[13px]"}>
        {label}
      </span>
      <span className="font-display font-700 text-[26px] leading-tight">{value}</span>
    </div>
  );
}
