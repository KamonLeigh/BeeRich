import type { ActionFunctionArgs } from '@remix-run/node';
import { redirect, unstable_parseMultipartFormData, json } from '@remix-run/node';
import { useNavigation } from '@remix-run/react';
import { requireUserId } from '~/module/session/session.server';
import { uploadeHandler, deleteAttachment } from '~/module/attachments.server';

import { Button } from '~/components/buttons';
import { Form, Input, Textarea } from '~/components/forms';
import { db } from '~/module/db.server';

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await unstable_parseMultipartFormData(request, uploadeHandler);
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

  let attachment = formData.get('attachment');
  if (!attachment || typeof attachment !== 'string') {
    attachment = null;
  }

  const expense = await db.expense.create({
    data: {
      title,
      description,
      amount: amountNumber,
      currencyCode: 'USD',
      attachment,
      User: {
        connect: {
          id: userId,
        },
      },
    },
  });

  return redirect(`/dashboard/expenses/${expense.id}`);
}
export default function Component() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle' && navigation.formAction === '/dashboard/expenses/?index';

  return (
    <Form method="post" action="/dashboard/expenses/?index" encType="multipart/form-data">
      <Input label="Title:" type="text" name="title" placeholder="Dinner for two" required />

      <Textarea label="Description" name="description" />

      <Input type="number" name="amount" label="Amount (in USD)" required defaultValue={0} />
      <Input label="Attachment" type="file" name="attachment" />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create'}
      </Button>
    </Form>
  );
}
