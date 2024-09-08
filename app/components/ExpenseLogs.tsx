import type { ExpenseLog } from '@prisma/client';

import type { ActionFunctionArgs, LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';

export default function ExpenseLogs({ expenseLogs }: { expenseLogs: SerializeFrom<ExpenseLog[]> }) {
  return (
    <ul className="space-y-2 max-h-[300px] lg:max-h-max overflow-y-scroll lg:overflow-hidden">
      {expenseLogs.map((expenseLog) => (
        <li key={expenseLog.id}>
          <p>
            <b>
              {`${expenseLog.title} - ${Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: expenseLog.currencyCode,
              }).format(expenseLog.amount)}`}
            </b>
          </p>
          {expenseLog.description && (
            <p>
              <i>{expenseLog.description}</i>
            </p>
          )}
          <p>{`${new Date(expenseLog.createdAt).toLocaleDateString('en-GB')} ${new Date(
            expenseLog.createdAt,
          ).toLocaleTimeString('en-GB')}`}</p>
        </li>
      ))}
    </ul>
  );
}
