import { CORS_HEADERS, json, protectedResourceMetadata } from '@/oauth/metadata';

/** RFC 9728 — servido em /.well-known/oauth-protected-resource via rewrite. */
export function GET(req: Request) {
  return json(protectedResourceMetadata(req));
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
