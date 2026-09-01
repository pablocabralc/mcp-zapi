/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Discovery OAuth 2.1 (RFC 9728 / RFC 8414). Next ignora pastas iniciadas
      // com ponto no roteador de arquivos, entao servimos via rewrite.
      {
        source: '/.well-known/oauth-protected-resource',
        destination: '/api/well-known/oauth-protected-resource',
      },
      {
        source: '/.well-known/oauth-protected-resource/:path*',
        destination: '/api/well-known/oauth-protected-resource',
      },
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/well-known/oauth-authorization-server',
      },
      {
        source: '/.well-known/oauth-authorization-server/:path*',
        destination: '/api/well-known/oauth-authorization-server',
      },
      // Atalho: /mcp -> /api/mcp
      { source: '/mcp', destination: '/api/mcp' },
      { source: '/sse', destination: '/api/sse' },
    ];
  },
};

export default nextConfig;
