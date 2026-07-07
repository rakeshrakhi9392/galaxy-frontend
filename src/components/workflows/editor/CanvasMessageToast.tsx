import { AlertCircle, Link2Off } from "lucide-react";

export type CanvasMessageToastVariant = "info" | "error";

function splitMessage(message: string): string[] {
  const parts = message.includes(" · ")
    ? message
        .split(" · ")
        .map((part) => part.trim())
        .filter(Boolean)
    : [message];

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    if (seen.has(part)) continue;
    seen.add(part);
    unique.push(part);
  }
  return unique;
}

export function CanvasMessageToast({
  message,
  variant = "error",
}: {
  message: string;
  variant?: CanvasMessageToastVariant;
}) {
  const items = splitMessage(message);
  const isError = variant === "error";

  const Icon = isError ? AlertCircle : Link2Off;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-canvas-message-toast flex w-full max-w-[min(92vw,480px)] items-start gap-2.5 rounded-xl border border-black bg-white px-3.5 py-2.5 text-black shadow-lg"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-black">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        {items.length === 1 ? (
          <p className="break-words text-left text-xs font-medium leading-relaxed text-black">
            {items[0]}
          </p>
        ) : (
          <ul className="space-y-1 text-left text-xs font-medium leading-relaxed text-black">
            {items.map((item, index) => (
              <li key={`${index}-${item}`} className="flex gap-2 break-words">
                <span
                  className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-black"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-black">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
