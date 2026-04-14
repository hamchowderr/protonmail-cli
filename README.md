# protonmail-cli

[![npm version](https://img.shields.io/npm/v/protonmail-cli.svg)](https://www.npmjs.com/package/protonmail-cli)
[![CI](https://github.com/hamchowderr/protonmail-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/hamchowderr/protonmail-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

A terminal-first email client for [ProtonMail](https://proton.me/mail) via [Proton Bridge](https://proton.me/mail/bridge). Full IMAP/SMTP access from the command line with JSON output for scripting and AI agent integration.

Works on **Windows**, **macOS**, and **Linux**. Ships as both a CLI tool and an importable TypeScript library.

Inspired by [pm-cli](https://github.com/bscott/pm-cli) (Go).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [Mail](#mail)
  - [Drafts](#drafts)
  - [Labels](#labels)
  - [Mailbox Management](#mailbox-management)
  - [Contacts](#contacts)
  - [Configuration](#configuration)
- [AI / Agent Integration](#ai--agent-integration)
- [Global Flags](#global-flags)
- [Message Selectors](#message-selectors)
- [Library Usage](#library-usage)
- [Configuration Files](#configuration-files)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Proton Bridge](https://proton.me/mail/bridge) installed, running, and signed in with your ProtonMail account

Proton Bridge provides local IMAP and SMTP access to your encrypted ProtonMail inbox. This CLI connects to Bridge on localhost — your emails never pass through any third-party servers.

## Installation

```bash
npm install -g protonmail-cli
```

Or use without installing:

```bash
npx protonmail-cli --help
```

## Quick Start

```bash
# 1. Set up your connection (interactive wizard)
protonmail-cli config init

# 2. Verify everything works
protonmail-cli config doctor

# 3. List your inbox
protonmail-cli mail list

# 4. Read a message
protonmail-cli mail read uid:515
```

The setup wizard prompts for:
- **Email address** — your ProtonMail address (e.g., `user@proton.me`)
- **IMAP/SMTP host and port** — defaults to `127.0.0.1:1143` / `127.0.0.1:1025`
- **Bridge password** — found in the Proton Bridge app under your account settings (this is different from your ProtonMail login password)

The Bridge password is stored securely in your system keyring:
- **Windows**: Credential Manager
- **macOS**: Keychain
- **Linux**: Secret Service (libsecret/GNOME Keyring)

---

## Commands

### Mail

#### List messages

```bash
protonmail-cli mail list                          # Default: 20 messages from INBOX
protonmail-cli mail list -n 50                    # Show 50 messages
protonmail-cli mail list --unread                 # Only unread
protonmail-cli mail list -m "Sent"                # From Sent folder
protonmail-cli mail list -p 2 -n 10              # Page 2, 10 per page
protonmail-cli mail list --json                   # JSON output
```

#### Read a message

```bash
protonmail-cli mail read uid:515                  # Read by UID (stable)
protonmail-cli mail read 42                       # Read by sequence number
protonmail-cli mail read uid:515 --html           # Show HTML body
protonmail-cli mail read uid:515 --raw            # Raw message source
protonmail-cli mail read uid:515 --headers        # Show all headers
protonmail-cli mail read uid:515 --json           # Full message as JSON
```

#### Send email

```bash
protonmail-cli mail send \
  -t "recipient@example.com" \
  -s "Meeting tomorrow" \
  -b "Let's meet at 2pm."

# Multiple recipients
protonmail-cli mail send \
  -t "alice@example.com" "bob@example.com" \
  --cc "carol@example.com" \
  -s "Team sync" \
  -b "Agenda attached" \
  -a agenda.pdf

# Pipe body from stdin
cat newsletter.txt | protonmail-cli mail send \
  -t "subscribers@example.com" \
  -s "Weekly Update"

# Prevent duplicate sends (24-hour TTL)
protonmail-cli mail send \
  -t "billing@example.com" \
  -s "Invoice #1234" \
  -b "Please find attached." \
  -a invoice.pdf \
  --idempotency-key "invoice-1234"
```

#### Reply and forward

```bash
protonmail-cli mail reply uid:515 -b "Thanks, sounds good!"
protonmail-cli mail reply uid:515 --all -b "Thanks everyone!"
protonmail-cli mail forward uid:515 -t "colleague@example.com" -b "FYI"
```

Reply and forward automatically set `In-Reply-To` and `References` headers for proper threading.

#### Search

```bash
protonmail-cli mail search "quarterly report"
protonmail-cli mail search "invoice" --from "billing@example.com"
protonmail-cli mail search "project" --since 2024-01-01 --before 2024-06-30
protonmail-cli mail search "attachment" -m "All Mail" --json
```

#### Message management

```bash
protonmail-cli mail delete uid:515                # Move to Trash
protonmail-cli mail delete uid:515 --permanent    # Permanently delete
protonmail-cli mail delete uid:515 uid:516 uid:517  # Multiple messages
protonmail-cli mail move uid:515 "Folders/Clients" # Move to folder
protonmail-cli mail archive uid:515 uid:516       # Move to Archive
protonmail-cli mail flag uid:515 --star           # Star a message
protonmail-cli mail flag uid:515 --read           # Mark as read
protonmail-cli mail flag uid:515 --unread         # Mark as unread
protonmail-cli mail flag uid:515 --unstar         # Remove star
```

#### Threading

```bash
protonmail-cli mail thread uid:515                # Show full conversation thread
protonmail-cli mail thread uid:515 --json         # Thread as JSON array
```

#### Attachments

```bash
protonmail-cli mail download uid:515 0            # Download first attachment
protonmail-cli mail download uid:515 0 -o ./report.pdf  # Save to specific path
```

#### Watch for new mail

```bash
protonmail-cli mail watch                          # Poll every 30 seconds
protonmail-cli mail watch -i 60                    # Poll every 60 seconds
protonmail-cli mail watch --unread                 # Only report unread
protonmail-cli mail watch --once                   # Exit after first new message
protonmail-cli mail watch --json                   # JSON events
protonmail-cli mail watch -e "notify-send 'New mail: {}'"  # Execute command on new mail
```

The `{}` placeholder in `--exec` is replaced with the message UID.

### Drafts

```bash
protonmail-cli mail draft list
protonmail-cli mail draft list -n 5

protonmail-cli mail draft create \
  -t "recipient@example.com" \
  -s "Work in progress" \
  -b "Draft content here"

protonmail-cli mail draft edit uid:100 -b "Updated draft content"
protonmail-cli mail draft delete uid:100
```

### Labels

```bash
protonmail-cli mail label list                    # List all labels
protonmail-cli mail label add uid:515 -l important
protonmail-cli mail label add uid:515 uid:516 -l urgent
protonmail-cli mail label remove uid:515 -l important
```

### Mailbox Management

```bash
protonmail-cli mailbox list                       # List all folders
protonmail-cli mailbox list --json                # JSON output
protonmail-cli mailbox create "Projects/2024"     # Create folder
protonmail-cli mailbox delete "Projects/2024"     # Delete folder
```

### Contacts

Local address book (stored as JSON, not synced with ProtonMail contacts):

```bash
protonmail-cli contacts list
protonmail-cli contacts list --json
protonmail-cli contacts search "alice"
protonmail-cli contacts add alice@example.com -n "Alice Smith"
protonmail-cli contacts remove alice@example.com
```

### Configuration

```bash
protonmail-cli config init                        # Interactive setup wizard
protonmail-cli config show                        # Display current config
protonmail-cli config show --json                 # Config as JSON
protonmail-cli config set defaults.limit 50       # Change default message limit
protonmail-cli config set defaults.format json    # Default to JSON output
protonmail-cli config validate                    # Test IMAP connectivity
protonmail-cli config doctor                      # Full 8-point diagnostic
```

`config doctor` checks:
1. Config file exists and parses
2. Email is configured
3. Password is in the keyring
4. IMAP port is reachable
5. SMTP port is reachable
6. IMAP authentication succeeds
7. SMTP authentication succeeds

---

## AI / Agent Integration

protonmail-cli is designed for AI agent use. Every command supports `--json` for structured output, and `--help-json` exports the full command schema for LLM tool discovery.

```bash
# Full command schema for tool use
protonmail-cli --help-json

# Structured message summary
protonmail-cli mail summarize uid:515 --json
# Returns: from, to, subject, date, word count, has_attachments, action_items

# Extract structured data from message body
protonmail-cli mail extract uid:515 --json
# Returns: emails, URLs, dates, phone numbers found in the message

# Idempotency keys prevent duplicate sends during agent retries
protonmail-cli mail send -t "user@example.com" -s "Report" -b "..." \
  --idempotency-key "agent-task-abc-123"

# Watch mode with command execution for event-driven agents
protonmail-cli mail watch --json -i 60 -e "process-email.sh {}"
```

**Stable message references**: Always use `uid:` selectors (e.g., `uid:515`) instead of sequence numbers. UIDs persist across sessions; sequence numbers shift when messages are deleted.

**RFC3339 timestamps**: All JSON output includes `date_iso` fields in RFC3339 format for reliable parsing.

---

## Global Flags

Every command accepts these flags:

| Flag | Short | Description |
|------|-------|-------------|
| `--json` | | Machine-readable JSON output |
| `--verbose` | `-v` | Verbose debug output |
| `--quiet` | `-q` | Suppress non-essential output |
| `--no-color` | | Disable ANSI color codes |
| `--config <path>` | `-c` | Use a custom config file |
| `--help` | `-h` | Show help for any command |

---

## Message Selectors

Messages can be referenced two ways:

| Format | Example | Stability |
|--------|---------|-----------|
| UID | `uid:515` | Stable across sessions (recommended) |
| Sequence number | `42` | Position-based, changes on delete |

Always prefer `uid:` selectors for scripts and automation.

---

## Library Usage

protonmail-cli also exports TypeScript classes for programmatic use:

```typescript
import { ImapClient, SmtpClient, loadConfig, getPassword } from 'protonmail-cli';

// Load config and credentials
const cfg = await loadConfig();
const password = await getPassword('protonmail-cli', cfg.bridge.email);

// IMAP operations
const imap = new ImapClient({
  host: cfg.bridge.imap_host,
  port: cfg.bridge.imap_port,
  email: cfg.bridge.email,
  password: password!,
});

await imap.connect();
const messages = await imap.listMessages('INBOX', 10, 0, false);
const message = await imap.getMessage('INBOX', 'uid:515');
const results = await imap.searchMessages('INBOX', { from: 'alice@example.com' });
await imap.disconnect();

// SMTP operations
const smtp = new SmtpClient({
  host: cfg.bridge.smtp_host,
  port: cfg.bridge.smtp_port,
  email: cfg.bridge.email,
  password: password!,
});

await smtp.send({
  from: cfg.bridge.email,
  to: ['recipient@example.com'],
  subject: 'Hello from the API',
  text: 'Sent programmatically!',
});
```

### Exported Types

```typescript
import type {
  Config, BridgeConfig, DefaultsConfig,
  MessageSummary, Message, Attachment,
  MailboxInfo, MailboxStatus,
  SearchOptions, DraftMessage,
  OutboundMessage, Contact,
} from 'protonmail-cli';
```

---

## Configuration Files

| File | Location (Linux) | Location (macOS) | Location (Windows) |
|------|-----------------|------------------|-------------------|
| Config | `~/.config/protonmail-cli/config.yaml` | `~/Library/Application Support/protonmail-cli/config.yaml` | `%APPDATA%\protonmail-cli\config.yaml` |
| Contacts | `~/.config/protonmail-cli/contacts.json` | `~/Library/Application Support/protonmail-cli/contacts.json` | `%APPDATA%\protonmail-cli\contacts.json` |
| Idempotency | `~/.config/protonmail-cli/idempotency.json` | `~/Library/Application Support/protonmail-cli/idempotency.json` | `%APPDATA%\protonmail-cli\idempotency.json` |
| Password | Secret Service / GNOME Keyring | Keychain | Credential Manager |

### Config file format

```yaml
bridge:
  imap_host: 127.0.0.1
  imap_port: 1143
  smtp_host: 127.0.0.1
  smtp_port: 1025
  email: your@protonmail.com
defaults:
  mailbox: INBOX
  limit: 20
  format: text   # or "json"
```

---

## How It Works

```
┌─────────────┐     STARTTLS      ┌───────────────┐     Encrypted     ┌──────────────┐
│             │◄──── IMAP ────────►│               │◄────────────────►│              │
│ protonmail  │   localhost:1143   │ Proton Bridge │                   │  ProtonMail  │
│    -cli     │◄──── SMTP ────────►│  (Desktop)    │   Proton Servers │   Servers    │
│             │   localhost:1025   │               │                   │              │
└─────────────┘                    └───────────────┘                   └──────────────┘
```

1. **Proton Bridge** runs as a desktop app, providing standard IMAP/SMTP on localhost
2. **protonmail-cli** connects to Bridge using STARTTLS (accepts Bridge's self-signed certificate)
3. Bridge handles all encryption/decryption transparently
4. Your emails never pass through any third-party infrastructure

---

## Troubleshooting

### `config doctor` fails on IMAP/SMTP port

Make sure Proton Bridge is running and signed in. Check that the ports match (default: IMAP 1143, SMTP 1025).

### Authentication fails

The Bridge password is **not** your ProtonMail login password. Find it in the Proton Bridge app: click your account → copy the password shown under "Mailbox details".

### `@napi-rs/keyring` install fails

On Linux, you may need `libsecret-1-dev`:

```bash
# Debian/Ubuntu
sudo apt install libsecret-1-dev

# Fedora
sudo dnf install libsecret-devel
```

On macOS and Windows, prebuilt binaries are included — no build tools needed.

### Headless Linux (no keyring daemon)

If you're on a server without a desktop environment, the keyring may not be available. You can set the password via environment variable as a workaround, or run `dbus-launch` to start a session bus.

### Connection timeout

Proton Bridge may take a moment to sync after first sign-in. Wait for syncing to complete (shown in the Bridge UI), then retry.

---

## Development

```bash
git clone https://github.com/hamchowderr/protonmail-cli.git
cd protonmail-cli
npm install
npm run dev        # tsx watch mode
npm run build      # tsup production build
npm run typecheck  # tsc --noEmit
npm test           # vitest (48 tests)
```

### Architecture

```
src/
├── cli.ts              ← CLI entry point (Commander.js)
├── index.ts            ← Library entry point (public exports)
├── imap/client.ts      ← ImapClient wrapping imapflow
├── smtp/client.ts      ← SmtpClient wrapping nodemailer
├── config/             ← YAML config + keyring + idempotency store
├── contacts/           ← Local JSON address book
├── output/             ← Formatter (JSON/text/table/color)
└── commands/           ← 30+ CLI command handlers
```

The project builds two outputs via tsup:
- **CLI binary** (`dist/cli.js`) — ESM with shebang, registered as `protonmail-cli` and `pm`
- **Library** (`dist/index.js` + `dist/index.cjs`) — dual ESM/CJS with TypeScript declarations

---

## License

[MIT](LICENSE)
