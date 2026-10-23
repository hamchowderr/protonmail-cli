export const APP_NAME = 'protonmail-cli';
export const DEFAULT_IMAP_HOST = '127.0.0.1';
export const DEFAULT_IMAP_PORT = 1143;
export const DEFAULT_SMTP_HOST = '127.0.0.1';
export const DEFAULT_SMTP_PORT = 1025;

export interface BridgeConfig {
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  email: string;
  name: string;
}

export interface DefaultsConfig {
  mailbox: string;
  limit: number;
  format: 'text' | 'json';
}

export interface Config {
  bridge: BridgeConfig;
  defaults: DefaultsConfig;
}

export function defaultConfig(): Config {
  return {
    bridge: {
      imap_host: DEFAULT_IMAP_HOST,
      imap_port: DEFAULT_IMAP_PORT,
      smtp_host: DEFAULT_SMTP_HOST,
      smtp_port: DEFAULT_SMTP_PORT,
      email: '',
      name: '',
    },
    defaults: {
      mailbox: 'INBOX',
      limit: 25,
      format: 'text',
    },
  };
}

/** From-header value: "Name" <email> when a display name is set, else the bare address. */
export function formatSender(email: string, name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return email;
  const escaped = trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}" <${email}>`;
}
