import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { method, url, headers, body } = await req.json();

  try {
    const fetchOpts: RequestInit = {
      method,
      headers: { ...headers },
    };

    if (body && !["GET", "HEAD"].includes(method)) {
      fetchOpts.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    let responseBody: unknown;
    const text = await res.text();
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }

    // Forward response headers
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      status: res.status,
      statusText: res.statusText,
      body: responseBody,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 0,
        statusText: "Network Error",
        body: null,
        headers: {},
        error: err instanceof Error ? err.message : "Proxy error",
      },
      { status: 502 }
    );
  }
}
