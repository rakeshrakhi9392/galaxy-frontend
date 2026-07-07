import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getBackendOrigin(): string {
  const raw =
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    "http://localhost:4010";
  return raw.replace(/\/$/, "");
}

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const search = req.nextUrl.search;
  const target = `${getBackendOrigin()}/api/v1/${path}${search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // @ts-expect-error — required by Node fetch when streaming a request body
    duplex: hasBody ? "half" : undefined,
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}
