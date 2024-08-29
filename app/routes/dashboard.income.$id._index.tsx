import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect, unstable_createFileUploadHandler, unstable_parseMultipartFormData } from '@remix-run/node';
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useParams,
  isRouteErrorResponse,
  useRouteError,
} from '@remix-run/react';

import { requireUserId } from '~/module/session/session.server';
import { H2 } from '~/components/headings';
import { Button } from '~/components/buttons';
import { Attachment, Form, Input, Textarea } from '~/components/forms';
import { FloatingActionLink } from '~/components/links';
import { db } from '~/module/db.server';
import { uploadeHandler, deleteAttachment, writeFile } from '~/module/attachments.server';

async function removeAttachment(formData: FormData, id: string, userId: string) {
  const attachmentUrl = formData.get('attachmentUrl');

  if (!attachmentUrl || typeof attachmentUrl !== 'string') {
    throw Error('something went wrong');
  }

  const fileName = attachmentUrl.split('/').pop();
  if (!fileName) throw Error('something went wrong');

  await db.invoice.update({
    where: { id_userId: { id, userId } },
    data: { attachment: null },
  });

  deleteAttachment(fileName);
  return json({ success: true });
}

async function updateIncome(formData: FormData, id: string, userId: string): Promise<Response> {
  const title = formData.get('title');
  const description = formData.get('description');
  const amount = formData.get('amount');

  if (typeof title !== 'string' || typeof description !== 'string' || typeof amount !== 'string') {
    throw Error('something went wrong');
  }

  const amountNumber = Number.parseFloat(amount);

  if (Number.isNaN(amountNumber)) {
    throw Error('something went wrong');
  }

  let attachment: FormDataEntryValue | null | undefined = formData.get('attcachment');

  if (!attachment || typeof attachment !== 'string') {
    attachment = undefined;
  }
  await db.invoice.update({
    where: {
      id_userId: { id, userId },
    },
    data: {
      title,
      description,
      amount: amountNumber,
      attachment,
    },
  });

  return json({ success: true });
}

async function deleteIncome(request: Request, id: string, userId: string): Promise<Response> {
  const referer = request.headers.get('referer');
  const redirectPath = referer || '/dashboard/income';

  try {
    const income = await db.invoice.delete({ where: { id_userId: { id, userId } } });

    if (income.attachment) {
      deleteAttachment(income.attachment);
    }
  } catch (err) {
    throw new Response('Not found', { status: 404 });
  }

  if (redirectPath.includes(id)) return redirect('/dashboard/income');
  return redirect(redirectPath);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  const userId = await requireUserId(request);
  if (!id) throw Error('id route parameter must be defined');
  const income = await db.invoice.findUnique({ where: { id_userId: { id, userId } } });

  if (!income) throw new Response('Not found', { status: 404 });

  return json(income);
}

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params;

  if (!id) throw Error('id route parameter must be defined');
  let formData: FormData;

  const contentType = request.headers.get('content-type');

  if (contentType?.toLowerCase().includes('multipart/form-data')) {
    formData = await unstable_parseMultipartFormData(request, uploadeHandler);
  } else {
    formData = await request.formData();
  }

  const userId = await requireUserId(request);

  const intent = formData.get('intent');

  if (intent === 'update') {
    return updateIncome(formData, id, userId);
  }

  if (intent === 'delete') {
    return deleteIncome(request, id, userId);
  }

  if (intent === 'remmove-attachment') {
    return removeAttachment(formData, id, userId);
  }

  throw new Response('Bad request', { status: 400 });
}

export default function Component() {
  const income = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state === 'idle' && navigation.formAction === `/dashboard/expenses/${income.id}`;
  return (
    <>
      <Form
        className="w-full h-full p-8"
        method="POST"
        action={`/dashboard/income/${income.id}?index`}
        key={income.id}
        encType="multipart/form-data"
      >
        <Input label="Title:" type="text" name="title" defaultValue={income.title} />
        <Input label="Amount (in USD)" type="number" name="amount" defaultValue={income.amount} />
        <Textarea label="Description" name="description" defaultValue={income.description || ''} />
        {income?.attachment ? (
          <Attachment
            label="Current Attachment"
            attachmentUrl={`/dashboard/expenses/${income.id}/attachments/${income.attachment}`}
          />
        ) : (
          <Input label="New Attachment" type="file" name="attachment" />
        )}
        <Button type="submit" name="intent" value="update">
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
        <p aria-live="polite" className="text-green-600">
          {actionData?.success && 'changes saved!'}
        </p>
      </Form>
      <FloatingActionLink to="/dashboard/income">Add Income</FloatingActionLink>
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { id } = useParams();

  let heading = 'Something went wrong';
  let message = ' Apologies, something went wrong on our end, please try again';

  if (isRouteErrorResponse(error) && error.status === 404) {
    heading = 'Income not found';
    message = `Apologies, the income with the is ${id} cannot be found.`;
  }

  return (
    <>
      <div className="w-full m-auto lg:max-w-3xl flex flex-col items-center justify-center gap-5">
        <H2>{heading}</H2>
        <p>{message}</p>
      </div>
      <FloatingActionLink to="/dashboard/income">Add Income</FloatingActionLink>
    </>
  );
}
