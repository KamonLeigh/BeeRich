import type { ActionFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { useNavigation } from '@remix-run/react';
import { requireUserId } from '~/module/session/session.server';
import { Button } from '~/components/buttons';
import { Form, Input, Textarea } from '~/components/forms';
import { unstable_parseMultipartFormData } from '@remix-run/node';
import { uploadHandler } from '~/module/attachments.server';
import { createIncome, parseInvoice } from '~/module/income.server';

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await unstable_parseMultipartFormData(request, uploadHandler);
  const incomeData = parseInvoice(formData);
  const income = await createIncome({ userId, ...incomeData });
  emitter.emit(userId);
  return redirect(`/dashboard/income/${income.id}`);
}

export default function Component() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle' && navigation.formAction === '/dashboard/income/?index';
  return (
    <Form method="post" action="/dashboard/income/?index" encType="multipart/form-data">
      <Input label="Title:" type="text" name="title" placeholder="Dinner for two" required />

      <Textarea label="Description" name="description" />

      <Input type="number" name="amount" label="Amount (in USD)" required defaultValue={0} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create'}
      </Button>
    </Form>
  );
}
