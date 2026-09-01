/**
 * Receptor no-op do webhook "ao enviar" (deliveryCallbackUrl) da Z-API.
 *
 * A Z-API so permite editar uma mensagem ja enviada (editMessageId) quando ha
 * um webhook configurado na instancia. Sem ele o campo e ignorado em silencio
 * e uma mensagem NOVA e criada. Este endpoint existe apenas para satisfazer
 * esse requisito.
 *
 * Ele responde 200 e DESCARTA o payload: nada e lido, gravado ou registrado em
 * log, para que o conteudo das mensagens nao saia da requisicao.
 */

export const dynamic = 'force-dynamic';

export function POST(): Response {
  return Response.json({ received: true });
}

/** Sonda de saude, util para conferir que a URL esta acessivel. */
export function GET(): Response {
  return Response.json({
    ok: true,
    purpose: 'Receptor no-op do webhook de envio da Z-API. Nao armazena nada.',
  });
}
