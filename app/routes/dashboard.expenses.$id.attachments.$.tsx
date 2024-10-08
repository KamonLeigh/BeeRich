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

  const expense = await db.expense.findUnique({
    where: { id_userId: { id, userId } },
  });

  if (!expense || !expense.attachment) throw new Response('Not found', { status: 404 });

  if (slug !== expense.attachment) return redirect(`/dashboard/expenses/${id}/attachments/${expense.attachment}`);

  // This id for demonstration this setting will save the picture on disk. If the user is logged out
  // the user can still download the file
  // Etag is a better option because if the user is logged out and make the same request twice it will
  // send the same file. Unlike the first method the server is hit

  const headers = new Headers();
  // headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  headers.set('ETag', expense.attachment);
  if (request.headers.get('If-None-Match') === expense.attachment) {
    return new Response(null, { status: 304, headers });
  }
  return buildFileResponse(expense.attachment, headers);
}
