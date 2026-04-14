import { ContactStore } from '../../contacts/store.js';
import type { CommandContext } from '../context.js';

export async function runContactsList(ctx: CommandContext): Promise<void> {
  const store = new ContactStore();
  const contacts = await store.list();

  if (ctx.formatter.isJSON) {
    ctx.formatter.printJSON(contacts);
  } else {
    ctx.formatter.printTable(
      contacts.map((c) => ({
        email: c.email,
        name: c.name ?? '',
        created: c.created,
      })),
    );
  }
}
