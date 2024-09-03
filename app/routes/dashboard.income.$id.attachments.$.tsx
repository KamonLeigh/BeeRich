import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { buildFileResponse } from '~/module/attachments.server';
import { db } from '~/module/db.server';
import { requireUserId } from '~/module/session/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { id } = params;
  const slug = params['*'];

  if (!id || !slug) throw Error('id and slug route parameters must be defined');

  const income = await db.invoice.findUnique({
    where: { id_userId: { id, userId } },
  });

  if (!income || !income.attachment) throw new Response('Not found', { status: 404 });

  if (slug !== income.attachment) return redirect(`/dashboard/income/${id}/attachments/${income.attachment}`);
  const headers = new Headers();
  headers.set('Etag', income.attachment);
  if (request.headers.get('If-None-Match') === income.attachment) {
    return new Response(null, { status: 304, headers });
  }
  return buildFileResponse(income.attachment);
}
