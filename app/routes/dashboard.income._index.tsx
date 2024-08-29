import type { ActionFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { useNavigation } from '@remix-run/react';
import { requireUserId } from '~/module/session/session.server';
import { Button } from '~/components/buttons';
import { Form, Input, Textarea } from '~/components/forms';
import { db } from '~/module/db.server';

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
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

  const income = await db.invoice.create({
    data: {
      title,
      description,
      amount: amountNumber,
      currencyCode: 'USD',
      User: {
        connect: {
          id: userId,
        },
      },
    },
  });

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
