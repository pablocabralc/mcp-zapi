import { allTools, toolGroups } from '@/tools';

export const dynamic = 'force-dynamic';

const styles = {
  main: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '48px 24px 80px',
    font: '15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    color: '#111827',
  },
  code: {
    background: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: 4,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 13,
  },
  pre: {
    background: '#0b0f14',
    color: '#e5e7eb',
    padding: 16,
    borderRadius: 10,
    overflowX: 'auto' as const,
    fontSize: 13,
    lineHeight: 1.55,
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: { textAlign: 'left' as const, padding: '8px 10px', borderBottom: '2px solid #e5e7eb' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6' },
};

export default function Home() {
  const groups = Object.entries(toolGroups).sort((a, b) => b[1].length - a[1].length);

  return (
    <main style={styles.main}>
      <h1 style={{ marginBottom: 4 }}>MCP Z-API</h1>
      <p style={{ color: '#6b7280', marginTop: 0 }}>
        Servidor MCP remoto com <strong>{allTools.length} tools</strong> cobrindo a API da Z-API (WhatsApp),
        protegido por OAuth 2.1 com PKCE.
      </p>

      <h2>Endpoint MCP</h2>
      <pre style={styles.pre}>https://SEU-DOMINIO.vercel.app/api/mcp</pre>
      <p>
        Transporte Streamable HTTP. O atalho <code style={styles.code}>/mcp</code> aponta para o mesmo handler.
      </p>

      <h2>Conectar no Claude Code</h2>
      <pre style={styles.pre}>claude mcp add --transport http zapi https://SEU-DOMINIO.vercel.app/api/mcp</pre>
      <p>
        O cliente descobre o servidor OAuth automaticamente via{' '}
        <code style={styles.code}>/.well-known/oauth-protected-resource</code>, se registra sozinho (RFC 7591) e
        abre a tela de login. Autentique com <code style={styles.code}>OAUTH_LOGIN_USERNAME</code> e{' '}
        <code style={styles.code}>OAUTH_LOGIN_PASSWORD</code>.
      </p>

      <h2>Tools por area</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Area</th>
            <th style={styles.th}>Tools</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([name, tools]) => (
            <tr key={name}>
              <td style={styles.td}>{name}</td>
              <td style={styles.td}>{tools.length}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...styles.td, fontWeight: 700 }}>Total</td>
            <td style={{ ...styles.td, fontWeight: 700 }}>{allTools.length}</td>
          </tr>
        </tbody>
      </table>

      <h2>Descoberta OAuth 2.1</h2>
      <ul>
        <li>
          <code style={styles.code}>/.well-known/oauth-protected-resource</code> — RFC 9728
        </li>
        <li>
          <code style={styles.code}>/.well-known/oauth-authorization-server</code> — RFC 8414
        </li>
        <li>
          <code style={styles.code}>/oauth/register</code> — Dynamic Client Registration (RFC 7591)
        </li>
        <li>
          <code style={styles.code}>/oauth/authorize</code> — PKCE S256 obrigatorio
        </li>
        <li>
          <code style={styles.code}>/oauth/token</code> — authorization_code e refresh_token
        </li>
      </ul>
    </main>
  );
}
