import { ZAPI_BASE_URL, ZAPI_PARTNER_TOKEN, resolveCredentials } from './env';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type RequestOptions = {
  /** Corpo JSON. Ignorado em GET. */
  body?: unknown;
  /** Query string. Chaves com valor undefined/null sao omitidas. */
  query?: Record<string, unknown>;
  /** Seleciona uma instancia nomeada de ZAPI_INSTANCES. */
  instanceAlias?: string;
};

export class ZapiError extends Error {
  constructor(
    readonly status: number,
    readonly method: HttpMethod,
    readonly path: string,
    readonly payload: unknown,
  ) {
    const detail =
      typeof payload === 'string'
        ? payload
        : (payload as { error?: string; message?: string })?.error ??
          (payload as { message?: string })?.message ??
          JSON.stringify(payload);
    super(`Z-API ${method} ${path} respondeu ${status}: ${detail}`);
    this.name = 'ZapiError';
  }
}

function buildQuery(query?: Record<string, unknown>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Chama a API da instancia:
 *   {base}/instances/{instanceId}/token/{instanceToken}/{path}
 */
export async function zapiRequest<T = unknown>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { instanceId, instanceToken, clientToken } = resolveCredentials(options.instanceAlias);
  const cleanPath = path.replace(/^\/+/, '');
  const url = `${ZAPI_BASE_URL}/instances/${encodeURIComponent(instanceId)}/token/${encodeURIComponent(
    instanceToken,
  )}/${cleanPath}${buildQuery(options.query)}`;

  return send<T>(method, url, path, options.body, clientToken ? { 'Client-Token': clientToken } : {});
}

/**
 * Chama a API de parceiro (nao usa instanceId/token na URL):
 *   {base}/{path}   com header `Partner-Token`.
 */
export async function partnerRequest<T = unknown>(
  method: HttpMethod,
  path: string,
  options: Omit<RequestOptions, 'instanceAlias'> = {},
): Promise<T> {
  if (!ZAPI_PARTNER_TOKEN) {
    throw new Error('ZAPI_PARTNER_TOKEN nao configurado — necessario para os endpoints de parceiro.');
  }
  const cleanPath = path.replace(/^\/+/, '');
  const url = `${ZAPI_BASE_URL}/${cleanPath}${buildQuery(options.query)}`;
  return send<T>(method, url, path, options.body, { 'Partner-Token': ZAPI_PARTNER_TOKEN });
}

async function send<T>(
  method: HttpMethod,
  url: string,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string>,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders };
  const init: RequestInit = { method, headers, cache: 'no-store' };

  if (body !== undefined && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const text = await response.text();

  let payload: unknown = text;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      /* mantem o texto cru quando nao for JSON */
    }
  }

  if (!response.ok) throw new ZapiError(response.status, method, path, payload);
  return (payload === '' ? { success: true } : payload) as T;
}

/**
 * Monta o corpo da requisicao a partir dos argumentos da tool, removendo
 * `undefined`, o seletor `instanceAlias` e quaisquer chaves que ja foram
 * usadas no path ou na query.
 */
export function toBody(args: Record<string, unknown>, omit: readonly string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || key === 'instanceAlias' || omit.includes(key)) continue;
    out[key] = value;
  }
  return out;
}
