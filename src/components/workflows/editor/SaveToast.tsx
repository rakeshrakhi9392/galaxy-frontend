export type SaveToastState = "idle" | "saving" | "saved" | "error" | "conflict";

export function SaveToast({
  state,
  text,
  onReload,
}: {
  state: SaveToastState;
  text: string;
  onReload?: () => void;
}) {
  if (state === "idle") return null;

  const colorClass =
    state === "saving"
      ? "border-gray-200 bg-white/95 text-gray-600"
      : state === "saved"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : state === "conflict"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      className={`absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur ${colorClass} ${state === "conflict" ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <span>{text}</span>
      {state === "conflict" && onReload ? (
        <button
          type="button"
          onClick={onReload}
          className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
        >
          Reload
        </button>
      ) : null}
    </div>
  );
}
