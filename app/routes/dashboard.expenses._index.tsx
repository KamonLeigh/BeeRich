import type { ActionFunctionArgs } from '@remix-run/node';
import { redirect, unstable_parseMultipartFormData, json } from '@remix-run/node';
import { useNavigation } from '@remix-run/react';
import { requireUserId } from '~/module/session/session.server';
import { uploadHandler } from '~/module/attachments.server';
import { parseExpense, createExpense } from '~/module/expenses.server';

import { Button } from '~/components/buttons';
import { Form, Input, Textarea } from '~/components/forms';

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await unstable_parseMultipartFormData(request, uploadHandler);
  const expenseData = parseExpense(formData);
  const expense = await createExpense({ userId, ...expenseData });
  emitter.emit(userId);
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
