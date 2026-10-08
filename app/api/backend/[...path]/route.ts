import { NextRequest, NextResponse } from "next/server";
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl";

/* Allow up to 120 MB bodies (video uploads) */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy to the backend so the browser only talks to the same origin (avoids
 * "Cannot reach the server" when the backend is on another port or host).
 * Request to /api/backend/auth/login -> BACKEND_URL/api/auth/login
 */
async function proxy(request: NextRequest, pathSegments: string[]) {
  const BACKEND_URL = getBackendProxyBaseUrl();
  const path = pathSegments.join("/");
  const search = request.nextUrl.search; // preserve query string (?key=val&…)
  const url = `${BACKEND_URL.replace(/\/$/, "")}/api/${path}${search}`;
  const method = request.method;
  const isCmsPublic = path === "cms/public";

  try {
    const headers: HeadersInit = {};
    request.headers.forEach((value, key) => {
      if (
        key.toLowerCase() !== "host" &&
        key.toLowerCase() !== "connection" &&
        key.toLowerCase() !== "content-length"
      ) {
        headers[key] = value;
      }
    });

    let body: BodyInit | undefined = undefined;
    if (method !== "GET" && method !== "HEAD") {
      const contentType = request.headers.get("content-type") || "";
      if (
        contentType.includes("multipart/form-data") ||
        contentType.includes("application/octet-stream")
      ) {
        // Binary upload — forward raw bytes
        body = Buffer.from(await request.arrayBuffer());
      } else {
        // JSON / text
        body = await request.text();
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const isHtml = contentType.includes("text/html");
    // Invoice print (and similar) endpoints intentionally return HTML documents.
    const isDocumentEndpoint =
      path === "document" ||
      path.endsWith("/document") ||
      /\/document$/i.test(path);

    // Upstream sometimes returns Next.js/HTML 404 when BACKEND_URL is the website, not FastAPI.
    // Do not treat intentional HTML document responses as proxy failures.
    if (isHtml) {
      const snippet = await res.text();
      if (isDocumentEndpoint && res.ok) {
        return new NextResponse(snippet, {
          status: res.status,
          statusText: res.statusText,
          headers: {
            "Content-Type": contentType || "text/html; charset=utf-8",
            "Cache-Control": "no-store, max-age=0",
            Pragma: "no-cache",
          },
        });
      }
      const looksLikeNext =
        snippet.includes("__NEXT_DATA__") ||
        snippet.includes("/_next/") ||
        (snippet.includes("<!DOCTYPE") && !isDocumentEndpoint);
      console.error(
        "[backend proxy] Non-JSON response",
        res.status,
        method,
        url,
        looksLikeNext ? "(HTML/Next.js page — wrong API host?)" : ""
      );
      return NextResponse.json(
        {
          detail:
            res.status === 404
              ? "No API at this URL (got a web page instead of JSON). Set NEXT_SERVER_BACKEND_URL to your FastAPI origin (e.g. http://127.0.0.1:8003 when running uvicorn locally). The public site hostname often does not expose POST /api/auth/login."
              : "Unexpected non-JSON response from upstream. Check NEXT_SERVER_BACKEND_URL.",
        },
        { status: 502 }
      );
    }

    if (contentType.includes("application/json")) {
      const text = await res.text();
      let data: unknown = text;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // keep as text
        }
      }

      if (res.status >= 500 || res.status === 405) {
        console.error("[backend proxy] Backend returned", res.status, "for", method, url);
        console.error("[backend proxy] Response:", typeof data === "object" ? JSON.stringify(data) : data);
        if (res.status === 405) {
          console.error("[backend proxy] 405 Method Not Allowed: ensure the backend at", BACKEND_URL, "has the route", method, "/api/" + path);
        }
      }

      return NextResponse.json(data, {
        status: res.status,
        statusText: res.statusText,
        headers: {
          "Content-Type": "application/json",
          ...(isCmsPublic
            ? {
                // CMS must reflect changes immediately; prevent any caching layers.
                "Cache-Control": "no-store, max-age=0",
                Pragma: "no-cache",
              }
            : {}),
        },
      });
    }

    // Non-JSON response (binary, HTML, etc.) — stream it through
    const resBody = await res.arrayBuffer();
    return new NextResponse(resBody, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        "Content-Type": contentType,
        ...(isCmsPublic
          ? {
              "Cache-Control": "no-store, max-age=0",
              Pragma: "no-cache",
            }
          : {}),
      },
    });
  } catch (err) {
    const isLocalhost =
      !BACKEND_URL || /^https?:\/\/127\.0\.0\.1|^https?:\/\/localhost/i.test(BACKEND_URL);
    const isProduction = process.env.NODE_ENV === "production";
    console.error("[backend proxy] fetch failed:", err);
    let detail: string;
    if (isProduction && isLocalhost) {
      detail =
        "Cannot reach the backend API at " +
        BACKEND_URL +
        ". Ensure the FastAPI server is running (e.g. pm2 status rockmartialarts-be).";
    } else if (isProduction) {
      detail = "Service temporarily unavailable. Please try again later.";
    } else {
      detail =
        "Cannot reach the backend at " +
        BACKEND_URL +
        ". Is it running? Error: " +
        (err instanceof Error ? err.message : String(err));
    }
    return NextResponse.json({ detail }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, path);
}
