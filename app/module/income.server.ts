import zod from 'zod';
import { deleteAttachment } from './attachments.server';
import { db } from './db.server';

type InvoiceCreateData = {
  title: string;
  description: string;
  amount: number;
  userId: string;
  attachment?: string;
};

export async function createIncome({ title, description, amount, attachment, userId }: InvoiceCreateData) {
  return db.invoice.create({
    data: {
      title,
      description,
      amount,
      currencyCode: 'USD',
      User: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export async function deleteIncome(id: string, userId: string) {
  const income = await db.invoice.delete({ where: { id_userId: { id, userId } } });

  if (income.attachment) {
    deleteAttachment(income.attachment);
  }
}

type InvoiceUpdateData = {
  id: string;
  title: string;
  description: string;
  amount: number;
  userId: string;
  attachment?: string;
};

export async function updateIncome({ id, title, description, amount, attachment, userId }: InvoiceUpdateData) {
  return db.invoice.update({
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

export async function removeAttachmentFromIncome(id: string, userId: string, fileName: string) {
  deleteAttachment(fileName);

  return db.invoice.update({
    where: { id_userId: { id, userId } },
    data: { attachment: null },
  });
}

const invoiceSchema = zod.object({
  title: zod.string(),
  amount: zod.string(),
  description: zod.string(),
});

export function parseInvoice(formData: FormData) {
  const data = Object.fromEntries(formData);
  const { title, description, amount } = invoiceSchema.parse(data);
  const amountnumber = Number.parseFloat(amount);

  if (Number.isNaN(amountnumber)) {
    throw Error('Invalid amount');
  }

  let attachment: FormDataEntryValue | null | undefined = formData.get('attachment');

  if (!attachment || typeof attachment !== 'string') {
    attachment = undefined;
  }

  return { title, description, amount: amountnumber, attachment };
}
