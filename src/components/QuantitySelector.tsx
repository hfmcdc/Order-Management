export default function QuantitySelector({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="touch-target w-11 h-11 rounded-full bg-clay-100 text-maroon-800 text-xl font-semibold flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="w-14 text-center font-display font-700 text-lg border-none bg-transparent"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="touch-target w-11 h-11 rounded-full bg-marigold-500 text-white text-xl font-semibold flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
