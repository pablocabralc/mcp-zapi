import { authorizationServerMetadata, CORS_HEADERS, json } from '@/oauth/metadata';

/** RFC 8414 — servido em /.well-known/oauth-authorization-server via rewrite. */
export function GET(req: Request) {
  return json(authorizationServerMetadata(req));
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
