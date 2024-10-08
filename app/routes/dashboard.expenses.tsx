import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Outlet,
  useLoaderData,
  useNavigation,
  useParams,
  Form,
  useLocation,
  useSearchParams,
  useSubmit,
} from '@remix-run/react';
import clsx from 'clsx';
import { requireUserId } from '~/module/session/session.server';
import { H1 } from '~/components/headings';
import { SearchInput } from '~/components/forms';
import { ListLinkItem } from '~/components/links';
import { db } from '~/module/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const searchString = url.searchParams.get('q');
  const expenses = await db.expense.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    where: {
      title: {
        contains: searchString ? searchString : '',
      },
      userId: userId,
    },
  });

  return json(expenses);
}

export default function Component() {
  const navigation = useNavigation();
  const expenses = useLoaderData<typeof loader>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const searchQuery = searchParams.get('q') || '';
  const id = useParams();

  return (
    <div className="w-full">
      <H1>Your expenses</H1>
      <div className="mt-10 w-full flex flex-col-reverse lg:flex-row">
        <section className="lg:p-8 w-full lg:max-w-2xl">
          <h2>All expenses</h2>
          <Form method="GET" action={location.pathname}>
            <SearchInput name="q" type="search" label="Search by title" defaultValue={searchQuery} />
          </Form>
          <ul className="flex flex-col">
            {expenses.map((expense) => (
              <ListLinkItem
                key={expense.id}
                to={`/dashboard/expenses/${expense.id}`}
                isActive={expense.id === id}
                deleteProps={{
                  ariaLabel: `Delete expense ${expense.id}`,
                  action: `/dashboard/expenses/${expense.id}?index`,
                }}
              >
                <p>
                  <i>{new Date(expense.createdAt).toLocaleDateString('en-US')}</i>
                </p>
                <p className="text-xl font-semibold">{expense.title}</p>
                <p>
                  <b>
                    {Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: expense.currencyCode,
                    }).format(expense.amount)}
                  </b>
                </p>
              </ListLinkItem>
            ))}
          </ul>
        </section>
        <section className={clsx('lg:p-8 w-full', navigation.state === 'loading' && 'motion-safe:animate-pulse')}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
