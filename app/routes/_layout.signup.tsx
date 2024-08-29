import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect, json } from '@remix-run/node';
import { useNavigation, useActionData } from '@remix-run/react';
import { createUserSession, getUserId, registerUser } from '~/module/session/session.server';

import { InlineError } from '~/components/texts';
import { Button } from '~/components/buttons';
import { Card } from '~/components/containers';
import { Form, Input } from '~/components/forms';
import { H1 } from '~/components/headings';

export const meta: MetaFunction = () => {
  return [
    { title: 'Sign Up | BeeRich' },
    { name: 'description', content: 'Log into your BeeRich account to track your expenses and income.' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) {
    redirect('/dashboard');
  }
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');

  if (!name || !email || !password) {
    throw new Error('Please fill in all forms...');
  }

  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
    throw new Error('Please provide valide details');
  }

  try {
    const user = await registerUser({ name, email, password });
    return redirect('/dashboard', {
      headers: await createUserSession(user),
    });
  } catch (error: any) {
    return json({ error: error?.message || 'Something went wrong' });
  }
}

export default function Component() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === 'idle' && navigation.formAction === '/signup';
  return (
    <Card>
      <Form method="POST" action="/signup">
        <H1>Sign Up</H1>
        <Input label="Name" name="name" required />
        <Input label="Email" name="email" required />
        <Input label="password" type="password" name="password" required />
        <Button disabled={isSubmitting} type="submit" isPrimary>
          {isSubmitting ? 'Signing you up...' : 'Sign up'}
        </Button>
        <InlineError aria-live="assertive">{actionData?.error && actionData.error} </InlineError>
      </Form>
    </Card>
  );
}
