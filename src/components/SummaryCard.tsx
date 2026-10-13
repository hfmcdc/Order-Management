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
          ? "rounded-[22px] bg-gradient-to-br from-wine-800 to-wine-900 text-cream px-5 py-5 flex flex-col gap-1.5 shadow-lg shadow-black/40"
          : "card px-5 py-5 flex flex-col gap-1.5"
      }
    >
      <span className={accent ? "text-cream/80 text-[13px]" : "text-maroon-700/60 text-[13px]"}>
        {label}
      </span>
      <span className="font-display font-700 text-[26px] leading-tight">{value}</span>
    </div>
  );
}
