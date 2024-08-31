import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect, unstable_parseMultipartFormData } from '@remix-run/node';
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
  useParams,
} from '@remix-run/react';

import { requireUserId } from '~/module/session/session.server';
import { Button } from '~/components/buttons';
import { Form, Input, Textarea, Attachment } from '~/components/forms';
import { H2 } from '~/components/headings';
import { FloatingActionLink } from '~/components/links';
import { db } from '~/module/db.server';
import { uploadHandler } from '~/module/attachments.server';
import { deleteExpense, parseExpense, removeAttachmentFromExpense, updateExpense } from '~/module/expenses.server';

async function handleRemoveAttachment(formData: FormData, id: string, userId: string): Promise<Response> {
  const attachmentUrl = formData.get('attachmentUrl');

  if (!attachmentUrl || typeof attachmentUrl !== 'string') {
    throw Error('something went wrong');
  }

  const fileName = attachmentUrl.split('/').pop();
  if (!fileName) throw Error('something went wrong');

  await removeAttachmentFromExpense(id, userId, fileName);
  return json({ success: true });
}

async function handleUpdateExpense(formData: FormData, id: string, userId: string): Promise<Response> {
  const expenseData = parseExpense(formData);
  await updateExpense({ id, userId, ...expenseData });
  return json({ success: true });
}

async function handleDeleteExpense(request: Request, id: string, userId: string): Promise<Response> {
  const referer = request.headers.get('referer');
  const redirectPath = referer || '/dashboard/expenses';

  try {
    await deleteExpense(id, userId);
  } catch (err) {
    throw new Response('Not found', { status: 404 });
  }

  if (redirectPath.includes(id)) return redirect('/dashboard/expenses');
  return redirect(redirectPath);
}
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  const userId = await requireUserId(request);
  if (!id) throw Error('id route parameter must be defined');
  const expense = await db.expense.findUnique({ where: { id_userId: { id, userId } } });
  if (!expense) throw new Response('Not found', { status: 404 });

  return json(expense);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) throw Error('id route parameter must be defined');

  let formData: FormData;
  const contentType = request.headers.get('content-type');

  if (contentType?.toLowerCase().includes('multipart/form-data')) {
    formData = await unstable_parseMultipartFormData(request, uploadHandler);
  } else {
    formData = await request.formData();
  }
  const intent = formData.get('intent');

  const userId = await requireUserId(request);

  if (intent === 'delete') {
    return handleDeleteExpense(request, id, userId);
  }

  if (intent === 'update') {
    return handleUpdateExpense(formData, id, userId);
  }

  if (intent === 'remove-attachment') {
    return handleRemoveAttachment(formData, id, userId);
  }

  throw new Response('Bad request', { status: 400 });
}

export default function Component() {
  const expense = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state === 'idle' && navigation.formAction === `/dashboard/expenses/${expense.id}`;
  return (
    <>
      <Form
        className="w-full h-full p-8"
        method="POST"
        action={`/dashboard/expenses/${expense.id}?index`}
        key={expense.id}
        encType="multipart/form-data"
      >
        <Input label="Title:" type="text" name="title" defaultValue={expense.title} required />
        <Input label="Amount (in USD)" type="number" name="amount" defaultValue={expense.amount} required />
        <Textarea label="Description" name="description" defaultValue={expense.description || ''} />
        {expense?.attachment ? (
          <Attachment
            label="Current Attachment"
            attachmentUrl={`/dashboard/expenses/${expense.id}/attachments/${expense.attachment}`}
          />
        ) : (
          <Input label="New Attachment" type="file" name="attachment" />
        )}
        <Button type="submit" name="intent" value="update" disabled={isSubmitting} isPrimary>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <p aria-live="polite" className="text-green-600">
          {actionData?.success && 'Changes saved!'}
        </p>
      </Form>
      <FloatingActionLink to="/dashboard/expenses">Add expenses</FloatingActionLink>
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { id } = useParams();

  let heading = 'Something went wrong';
  let message = 'Apologies, something went wrong on our end, please try again';

  if (isRouteErrorResponse(error) && error.status === 404) {
    heading = 'Expense not found';
    message = `Apologies, the expense with the id ${id} cannot be found.`;
  }

  return (
    <>
      <div className="w-full m-auto lg:max-w-3xl flex flex-col items-center justify-center gap-5">
        <H2>{heading}</H2>
        <p>{message}</p>
      </div>
      <FloatingActionLink to="/dashboard/expenses">Add expense</FloatingActionLink>
    </>
  );
}
