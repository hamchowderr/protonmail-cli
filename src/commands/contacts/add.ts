import { ContactStore } from '../../contacts/store.js';
import type { CommandContext } from '../context.js';

export interface ContactAddOptions {
  name?: string;
}

export async function runContactsAdd(
  ctx: CommandContext,
  email: string,
  opts: ContactAddOptions,
): Promise<void> {
  const store = new ContactStore();
  const contact = await store.add(email, opts.name);

  if (ctx.formatter.isJSON) {
    ctx.formatter.printJSON(contact);
  } else {
    ctx.formatter.printSuccess(`Contact added: ${contact.email}`);
  }
}
