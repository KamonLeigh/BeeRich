import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Outlet, useLoaderData, useNavigation, useParams, Form, useLocation, useSearchParams } from '@remix-run/react';
import clsx from 'clsx';
import { requireUserId } from '~/module/session/session.server';
import { H1 } from '~/components/headings';
import { SearchInput } from '~/components/forms';

import { ListLinkItem } from '~/components/links';
import { db } from '~/module/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const userId = await requireUserId(request);
  const searchString = url.searchParams.get('q');
  const incomes = await db.invoice.findMany({
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

  return json(incomes);
}

export default function Component() {
  const navigation = useNavigation();
  const incomes = useLoaderData<typeof loader>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const id = useParams();
  return (
    <div className="w-full">
      <H1>Your Income</H1>
      <Form method="GET" action={location.pathname}>
        <SearchInput name="q" type="search" label="Search by title" defaultValue={searchQuery} />
      </Form>
      <div className="mt-10 w-full flex flex-col-reverse lg:flex-row">
        <section className="lg:p-8 w-full lg:max-w-2xl">
          <h2>All incomes</h2>
          <ul className="flex flex-col">
            {incomes.map((income) => (
              <ListLinkItem
                key={income.id}
                to={`/dashboard/income/${income.id}`}
                isActive={income.id === id}
                deleteProps={{
                  ariaLabel: `Delete income ${income.id}`,
                  action: `/dashboard/income/${income.id}`,
                }}
              >
                <p>
                  <i>{new Date(income.createdAt).toLocaleDateString('en-US')}</i>
                </p>
                <p className="text-xl font-semibold">{income.title}</p>
                <p>
                  <b>
                    {Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: income.currencyCode,
                    }).format(income.amount)}
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
