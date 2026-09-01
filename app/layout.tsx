import type { ReactNode } from 'react';

export const metadata = {
  title: 'MCP Z-API',
  description: 'Servidor MCP remoto com a API completa da Z-API (WhatsApp), protegido por OAuth 2.1.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
