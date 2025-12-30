import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://api:8000/api/v1';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleRequest(request, params);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleRequest(request, params);
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleRequest(request, params);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
    return handleRequest(request, params);
}

async function handleRequest(request: NextRequest, params: { path: string[] }) {
    const path = (await params).path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();

    // Ensure we maintain the trailing slash if present to avoid 307 redirects from FastAPI
    const isTrailingSlash = request.nextUrl.pathname.endsWith('/');
    const url = `${BACKEND_URL}/${path}${isTrailingSlash && path ? '/' : ''}${searchParams ? `?${searchParams}` : ''}`;

    // Use server-side API_KEY for authentication
    const apiKey = process.env.API_KEY || 'dev-api-key';

    // Prepare headers for the backend request
    const headers = new Headers();
    headers.set('authorization', `Bearer ${apiKey}`);

    // Pass along other common useful headers
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);

    console.log(`[Proxy] ${request.method} ${url}`);

    try {
        // Clone the ArrayBuffer to avoid "detached ArrayBuffer" errors
        // This happens because the original ArrayBuffer can become detached after being read
        let body: BodyInit | undefined = undefined;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const arrayBuffer = await request.arrayBuffer();
            body = new Uint8Array(arrayBuffer) as BodyInit;
            console.log(`[Proxy] Body size: ${arrayBuffer.byteLength} bytes`);
        }

        // Use manual redirect to prevent body loss during 307/308 redirects
        const response = await fetch(url, {
            method: request.method,
            headers: headers,
            body: body,
            redirect: 'manual',
        });

        // Handle 307/308 redirects manually to preserve body
        if (response.status === 307 || response.status === 308) {
            const redirectUrl = response.headers.get('location');
            console.log(`[Proxy] Redirect ${response.status} to: ${redirectUrl}`);
            if (redirectUrl) {
                const redirectResponse = await fetch(redirectUrl, {
                    method: request.method,
                    headers: headers,
                    body: body,
                    redirect: 'follow',
                });

                const responseHeaders = new Headers(redirectResponse.headers);
                responseHeaders.delete('transfer-encoding');

                return new NextResponse(redirectResponse.body, {
                    status: redirectResponse.status,
                    headers: responseHeaders,
                });
            }
        }

        // If we still get a 401/403 despite sending headers, it might be the fetch-redirect-strip behavior
        // Let's log if we detect a potential strip (this is for debug visibility)
        if (response.status === 401 || response.status === 403) {
            console.warn(`Proxy received ${response.status} from ${url}. Check if Authorization was stripped during potential redirect.`);
        }

        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete('transfer-encoding');

        return new NextResponse(response.body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error(`Proxy error for ${url}:`, error);
        return NextResponse.json({ message: 'Internal Server Error (Proxy)' }, { status: 500 });
    }
}

