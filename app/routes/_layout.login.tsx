import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction, LinksFunction } from '@remix-run/node';
import { useActionData, useNavigation } from '@remix-run/react';
import { redirect, json } from '@remix-run/node';
import { InlineError } from '~/components/texts';
import { Button } from '~/components/buttons';
import { Card } from '~/components/containers';
import { Form, Input } from '~/components/forms';
import { H1 } from '~/components/headings';

import { createUserSession, loginUser, getUserId } from '~/module/session/session.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'Log In | BeeRich' },
    { name: 'description', content: 'Log into your BeeRich account to track your expenses and income.' },
  ];
};

//export const links: LinksFunction = () => [{ rel: 'stylesheet', href: loginCSS }];
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (userId) {
    redirect('/dashboard');
  }
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    throw new Error('Pleses fill in all the from ');
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Please provide volide details.');
  }

  try {
    const user = await loginUser({ email, password });

    return redirect('/dashboard', {
      headers: await createUserSession(user),
    });
  } catch (error: any) {
    return json({ error: error?.message || 'Somerthing went wrong' });
  }
}

export default function Component() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === 'idle' && navigation.formAction === '/login';

  return (
    <Card>
      <Form method="POST" action="/login">
        <H1>Log in</H1>

        <Input label="Email" name="email" required />
        <Input label="password" type="password" name="password" required />
        <Button type="submit" disabled={isSubmitting} isPrimary>
          {isSubmitting ? 'Logging you in...' : 'Log in'}
        </Button>
        <InlineError aria-live="assertive">{actionData?.error && actionData.error} </InlineError>
      </Form>
    </Card>
  );
}
