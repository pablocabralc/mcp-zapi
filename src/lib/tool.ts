import { z } from 'zod';

/** Campo aceito por TODAS as tools: escolhe uma instancia nomeada de ZAPI_INSTANCES. */
export const instanceAlias = z
  .string()
  .optional()
  .describe('Opcional. Alias de uma instancia definida em ZAPI_INSTANCES; omita para usar a instancia padrao.');

export type ToolAnnotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export type ToolDef = {
  /** Nome unico da tool, sempre com prefixo `zapi_`. */
  name: string;
  /** Titulo curto legivel. */
  title: string;
  /** O que a tool faz, em portugues, incluindo METODO e path da Z-API. */
  description: string;
  /** Shape zod dos argumentos (deve incluir `instanceAlias`). */
  inputSchema: z.ZodRawShape;
  annotations?: ToolAnnotations;
  handler: (args: any) => Promise<unknown>;
};

/** Helper para declarar uma tool com o campo `instanceAlias` ja embutido. */
export function defineTool(def: Omit<ToolDef, 'inputSchema'> & { inputSchema?: z.ZodRawShape }): ToolDef {
  return { ...def, inputSchema: { ...(def.inputSchema ?? {}), instanceAlias } };
}

/** Campos comuns e reutilizaveis entre varias tools. */
export const phone = z
  .string()
  .describe('Numero no formato DDI+DDD+numero (ex.: 5511999999999) ou ID de grupo (ex.: 120363...@g.us).');

export const delayMessage = z
  .number()
  .int()
  .min(1)
  .max(15)
  .optional()
  .describe('Opcional. Segundos de espera antes de enviar (1 a 15).');

export const delayTyping = z
  .number()
  .int()
  .min(1)
  .max(15)
  .optional()
  .describe('Opcional. Segundos exibindo "digitando..." antes de enviar (1 a 15).');

export const messageId = z.string().describe('ID da mensagem (messageId retornado no envio ou recebido no webhook).');
