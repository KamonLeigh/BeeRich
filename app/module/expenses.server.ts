import zod from 'zod';
import { deleteAttachment } from './attachments.server';
import { db } from '~/module/db.server';

type ExpenseCreateData = {
  title: string;
  description: string;
  amount: number;
  userId: string;
  attachment?: string;
};
export async function createExpense({ title, description, amount, attachment, userId }: ExpenseCreateData) {
  return db.expense.create({
    data: {
      title,
      description,
      amount,
      currencyCode: 'USD',
      attachment,
      User: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export async function deleteExpense(id: string, userId: string) {
  const expense = await db.expense.delete({ where: { id_userId: { id, userId } } });

  if (expense.attachment) {
    deleteAttachment(expense.attachment);
  }
}

type ExpenseUpdateData = {
  id: string;
  userId: string;
  title: string;
  description: string;
  amount: number;
  attachment?: string;
};

export async function updateExpense({ id, title, description, amount, attachment, userId }: ExpenseUpdateData) {
  return db.expense.update({
    where: {
      id_userId: { id, userId },
    },
    data: {
      title,
      description,
      amount,
      attachment,
    },
  });
}

export async function removeAttachmentFromExpense(id: string, userId: string, fileName: string) {
  deleteAttachment(fileName);
  return db.expense.update({
    where: { id_userId: { id, userId } },
    data: { attachment: null },
  });
}

const expenseSchema = zod.object({
  title: zod.string(),
  amount: zod.string(),
  description: zod.string(),
});

export function parseExpense(formData: FormData) {
  const data = Object.fromEntries(formData);
  const { title, description, amount } = expenseSchema.parse(data);
  const amountNumber = Number.parseFloat(amount);

  if (Number.isNaN(amountNumber)) {
    throw Error('Invalid amount');
  }

  let attachment: FormDataEntryValue | null | undefined = formData.get('attachment');

  if (!attachment || typeof attachment !== 'string') {
    attachment = undefined;
  }

  return { title, description, amount: amountNumber, attachment };
}
