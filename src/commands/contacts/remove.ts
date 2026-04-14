import { ContactStore } from '../../contacts/store.js';
import type { CommandContext } from '../context.js';

export async function runContactsRemove(ctx: CommandContext, email: string): Promise<void> {
  const store = new ContactStore();
  const removed = await store.remove(email);

  if (removed) {
    ctx.formatter.printSuccess(`Contact removed: ${email}`);
  } else {
    ctx.formatter.printError(`Contact not found: ${email}`);
  }
}
