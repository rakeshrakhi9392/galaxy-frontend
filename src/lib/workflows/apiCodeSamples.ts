import { extractPlaygroundInputs } from "./playgroundInputs";

export type ApiCodeLanguage = "python" | "curl" | "javascript";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4010";
}

function buildValuesComment(workflowId: string, graph: unknown): string {
  const inputs = extractPlaygroundInputs(graph);
  if (inputs.length === 0) return "";

  const lines = inputs.map((input) => `        "${input.label}": "your text here"`);
  return `
# Optional: update workflow inputs before running
# PUT ${getApiBaseUrl()}/api/v1/workflows/${workflowId}
# Body: { "nodes": [...], "edges": [...] } with request node dynamicFields updated
# Playground input fields:
# {
${lines.join("\n")}
# }`;
}

export function buildApiCodeSample(
  language: ApiCodeLanguage,
  workflowId: string,
  graph: unknown,
): string {
  const base = getApiBaseUrl();
  const startUrl = `${base}/api/v1/workflows/${workflowId}/runs`;
  const pollUrlTemplate = `${base}/api/v1/runs/{run_id}`;
  const valuesComment = buildValuesComment(workflowId, graph);

  if (language === "curl") {
    return `curl -X POST "${startUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"scope":"FULL"}'

# Poll until complete
curl "${pollUrlTemplate.replace("{run_id}", "RUN_ID")}" \\
  -H "Authorization: Bearer YOUR_API_KEY"${valuesComment}`;
  }

  if (language === "javascript") {
    return `const apiKey = "YOUR_API_KEY";
const workflowId = "${workflowId}";
const startUrl = \`${startUrl}\`;

const data = {
  scope: "FULL",
};

async function pollForResult(runId) {
  const pollUrl = \`${base}/api/v1/runs/\${runId}\`;
  while (true) {
    const response = await fetch(pollUrl, {
      headers: { Authorization: \`Bearer \${apiKey}\` },
    });
    const result = await response.json();
    const status = result.run.status;

    if (status === "SUCCESS") return result;
    if (status === "FAILED" || status === "CANCELLED") {
      throw new Error(result.run.errorSummary ?? "Run failed");
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}

const response = await fetch(startUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${apiKey}\`,
  },
  body: JSON.stringify(data),
});

const result = await response.json();
const runId = result.run.id;
console.log(\`Run started: \${runId}\`);

const final = await pollForResult(runId);
console.log(JSON.stringify(final, null, 2));${valuesComment}`;
  }

  return `import requests
import time
import json

api_key = "YOUR_API_KEY"
workflow_id = "${workflowId}"
url = "${startUrl}"

data = {
    "scope": "FULL",
}

def poll_for_result(run_id):
    """Poll the API until the generation is complete"""
    poll_url = f"${base}/api/v1/runs/{run_id}"
    while True:
        response = requests.get(
            poll_url,
            headers={'Authorization': f'Bearer {api_key}'}
        )
        result = response.json()
        status = result['run']['status']

        if status == 'SUCCESS':
            return result
        elif status in ['FAILED', 'CANCELLED']:
            raise Exception(f"Run failed: {result['run'].get('errorSummary', 'Unknown error')}")

        time.sleep(2)

# Start the run
response = requests.post(
    url,
    json=data,
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
)

result = response.json()
run_id = result['run']['id']
print(f"Run started: {run_id}")

# Poll for result
final = poll_for_result(run_id)
print(json.dumps(final, indent=2))${valuesComment}`;
}

export const API_CODE_LANGUAGES: { id: ApiCodeLanguage; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "curl", label: "cURL" },
  { id: "javascript", label: "JavaScript" },
];
