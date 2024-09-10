import { EventEmitter } from 'events';

declare global {
  //eslint-disable-next-line-no-var
  var emitter: EventEmitter;
}

global.emitter = global.emitter || new EventEmitter();

export const emitter = global.emitter;

export type SendEvent = (event: string, data: string) => void;
export type OnSetUp = (send: SendEvent) => OnClose;
export type OnClose = () => void;

export function eventStream(request: Request, onSetup: OnSetUp) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send: SendEvent = (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${data}\n`));
      };

      const onClose = onSetup(send);
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        onClose();
        request.signal.removeEventListener('abort', close);
        controller.close();
      };
      request.signal.addEventListener('abort', close);

      if (request.signal.aborted) {
        close();
        return;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    },
  });
}
