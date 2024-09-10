import type { LoaderFunctionArgs } from '@remix-run/node';
import type { OnSetUp } from '~/module/server-sent-events/events.server';
import { emitter, eventStream } from '~/module/server-sent-events/events.server';
import { requireUserId } from '~/module/session/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const onSetup: OnSetUp = (send) => {
    function handler() {
      send('server-change', `Data change for ${userId}`);
    }
    emitter.addListener(userId, handler);
    return () => {
      emitter.removeListener(userId, handler);
    };
  };
  return eventStream(request, onSetup);
}
