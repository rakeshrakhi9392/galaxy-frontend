import type { ReactNode } from "react";

const PY_KEYWORDS = new Set([
  "import",
  "from",
  "as",
  "def",
  "while",
  "if",
  "elif",
  "else",
  "return",
  "raise",
  "in",
  "True",
  "False",
  "None",
  "async",
  "await",
  "const",
  "let",
  "function",
  "throw",
  "new",
]);

function highlightPythonTokens(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === "#") {
      nodes.push(
        <span key={i} className="italic text-muted-foreground">
          {line.slice(i)}
        </span>,
      );
      break;
    }

    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) j += 1;
      if (j < line.length) j += 1;
      nodes.push(
        <span key={i} className="text-emerald-600 dark:text-emerald-400">
          {line.slice(i, j)}
        </span>,
      );
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(line[i] ?? "")) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j] ?? "")) j += 1;
      const word = line.slice(i, j);
      nodes.push(
        <span
          key={i}
          className={
            PY_KEYWORDS.has(word)
              ? "text-violet-600 dark:text-violet-400"
              : "text-foreground"
          }
        >
          {word}
        </span>,
      );
      i = j;
      continue;
    }

    nodes.push(<span key={i}>{line[i]}</span>);
    i += 1;
  }

  return nodes;
}

function highlightLine(line: string, language: "python" | "curl" | "javascript"): ReactNode {
  if (language === "python" || language === "javascript") {
    return <>{highlightPythonTokens(line)}</>;
  }

  if (line.trim().startsWith("#") || line.trim().startsWith("//")) {
    return <span className="italic text-muted-foreground">{line}</span>;
  }

  const parts = line.split(/(".*?"|'.*?')/g);
  return (
    <>
      {parts.map((part, idx) =>
        part.startsWith('"') || part.startsWith("'") ? (
          <span key={idx} className="text-emerald-600 dark:text-emerald-400">
            {part}
          </span>
        ) : (
          <span key={idx} className="text-foreground">
            {part}
          </span>
        ),
      )}
    </>
  );
}

export function HighlightedCodeBlock({
  code,
  language,
}: {
  code: string;
  language: "python" | "curl" | "javascript";
}) {
  const lines = code.split("\n");

  return (
    <pre className="font-mono text-[12px] leading-5">
      {lines.map((line, index) => (
        <div key={index} className="flex">
          <span className="inline-block w-10 shrink-0 select-none pr-4 text-right text-muted-foreground/40">
            {index + 1}
          </span>
          <span>{highlightLine(line, language)}</span>
        </div>
      ))}
    </pre>
  );
}
