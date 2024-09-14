import type { LoaderFunctionArgs } from '@remix-run/node';
import type { Prisma } from '@prisma/client';
import { json } from '@remix-run/node';
import { Outlet, useLoaderData, useNavigation, useParams, Form, useLocation, useSearchParams } from '@remix-run/react';
import clsx from 'clsx';
import { requireUserId } from '~/module/session/session.server';
import { H1 } from '~/components/headings';
import { SearchInput } from '~/components/forms';

import { ListLinkItem } from '~/components/links';
import { db } from '~/module/db.server';
const PAGE_SIZE = 10;
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const userId = await requireUserId(request);
  const searchString = url.searchParams.get('q');
  const pageNumberString = url.searchParams.get('page');
  const pageNumber = pageNumberString ? Number(pageNumberString) : 1;

  const where: Prisma.InvoiceWhereInput = {
    userId,
    title: {
      contains: searchString ? searchString : '',
    },
  };

  const [count, incomes] = await db.$transaction([
    db.invoice.count({ where }),
    db.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: PAGE_SIZE, skip: (pageNumber - 1) * PAGE_SIZE, where }),
  ]);

  return json({ incomes, count });
}

export default function Component() {
  const navigation = useNavigation();
  const { incomes, count } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const pageNumberString = searchParams.get('page');
  const pageNumber = pageNumberString ? Number(pageNumberString) : 1;
  const isFirstPage = pageNumber === 1;
  const showPagination = count > PAGE_SIZE || !isFirstPage;
  const id = useParams();
  return (
    <div className="w-full">
      <H1>Your Income</H1>
      <div className="mt-10 w-full flex flex-col-reverse lg:flex-row">
        <section className="lg:p-8 w-full lg:max-w-2xl">
          <h2>All Income</h2>
          <Form method="GET" action={location.pathname}>
            <input type="hidden" name="page" value={1} />
            <SearchInput name="q" type="search" label="Search by title" defaultValue={searchQuery} />
          </Form>
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
          {showPagination && (
            <Form method="GET" action={location.pathname} className="flex justify-between pb-10">
              <input type="hidden" name="q" value={searchQuery} />
              <button type="submit" name="page" value={pageNumber - 1} disabled={pageNumber === 1}>
                Previous
              </button>
              <button type="submit" name="page" value={pageNumber + 1} disabled={count <= pageNumber * PAGE_SIZE}>
                Next
              </button>
            </Form>
          )}
        </section>
        <section className={clsx('lg:p-8 w-full', navigation.state === 'loading' && 'motion-safe:animate-pulse')}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
