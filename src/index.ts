// Core clients
export { ImapClient } from './imap/index.js';
export type { ImapClientOptions } from './imap/index.js';
export { SmtpClient } from './smtp/index.js';
export type { OutboundMessage, SmtpClientOptions, SentMessageInfo } from './smtp/index.js';
export { ContactStore } from './contacts/index.js';

// Config utilities
export {
  loadConfig,
  saveConfig,
  configPath,
  configDir,
  configExists,
  defaultConfig,
  APP_NAME,
} from './config/index.js';

export { getPassword, setPassword, deletePassword } from './config/index.js';
export { checkIdempotencyKey, recordIdempotencyKey } from './config/index.js';

// Output
export { Formatter } from './output/index.js';
export type { FormatterOptions } from './output/index.js';

// Command context (for building tools on top)
export { makeContext } from './commands/context.js';
export type { CommandContext, GlobalOptions } from './commands/context.js';

// IMAP types
export {
  parseMessageSelector,
} from './imap/index.js';

export type {
  MailboxInfo,
  MailboxStatus,
  MessageSummary,
  Message,
  Attachment,
  SearchOptions,
  DraftMessage,
  MessageSelector,
} from './imap/index.js';

// Config types
export type {
  Config,
  BridgeConfig,
  DefaultsConfig,
} from './config/index.js';

// Contact types
export type { Contact } from './contacts/index.js';
