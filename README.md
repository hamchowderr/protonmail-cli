# protonmail-cli

Terminal email client for [ProtonMail](https://proton.me/mail) via [Proton Bridge](https://proton.me/mail/bridge) IMAP/SMTP.

Works on **Windows**, **macOS**, and **Linux**. Also usable as an importable TypeScript library.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Proton Bridge](https://proton.me/mail/bridge) installed, running, and signed in

## Install

```bash
npm install -g protonmail-cli
```

## Setup

```bash
# Interactive setup wizard
protonmail-cli config init

# Verify everything works
protonmail-cli config doctor
```

The setup wizard prompts for your email, Proton Bridge host/port, and Bridge-specific password (found in the Bridge app under your account settings). The password is stored securely in your system keyring (Windows Credential Manager, macOS Keychain, or Linux Secret Service).

## Usage

### List messages

```bash
protonmail-cli mail list
protonmail-cli mail list --unread -n 10
protonmail-cli mail list --json
```

### Read a message

```bash
protonmail-cli mail read uid:515
protonmail-cli mail read uid:515 --json
protonmail-cli mail read uid:515 --html
```

### Send email

```bash
protonmail-cli mail send -t "user@example.com" -s "Subject" -b "Body"

# With attachments
protonmail-cli mail send -t "user@example.com" -s "Report" -b "See attached" -a report.pdf

# Pipe body from stdin
echo "Hello from the CLI" | protonmail-cli mail send -t "user@example.com" -s "Hello"

# Idempotency key prevents duplicate sends on retry
protonmail-cli mail send -t "user@example.com" -s "Invoice" -b "..." --idempotency-key "inv-2024-001"
```

### Reply and forward

```bash
protonmail-cli mail reply uid:515 -b "Thanks!"
protonmail-cli mail reply uid:515 --all -b "Thanks everyone!"
protonmail-cli mail forward uid:515 -t "colleague@example.com"
```

### Search

```bash
protonmail-cli mail search "quarterly report"
protonmail-cli mail search "invoice" --from "billing@example.com" --since 2024-01-01
```

### Other commands

```bash
# Message management
protonmail-cli mail delete uid:515
protonmail-cli mail move uid:515 Archive
protonmail-cli mail archive uid:515 uid:516
protonmail-cli mail flag uid:515 --star
protonmail-cli mail flag uid:515 --read

# Threading
protonmail-cli mail thread uid:515

# Attachments
protonmail-cli mail download uid:515 0 -o ./attachment.pdf

# Watch for new mail
protonmail-cli mail watch -i 30 --exec "echo New mail: {}"

# Drafts
protonmail-cli mail draft list
protonmail-cli mail draft create -t "user@example.com" -s "Draft" -b "WIP"

# Labels
protonmail-cli mail label list
protonmail-cli mail label add uid:515 -l important

# Mailbox management
protonmail-cli mailbox list
protonmail-cli mailbox create "My Folder"

# Local contacts
protonmail-cli contacts add user@example.com -n "User Name"
protonmail-cli contacts search "user"

# Diagnostics
protonmail-cli config doctor
protonmail-cli config show
```

### AI / agent commands

```bash
# Structured message summary
protonmail-cli mail summarize uid:515 --json

# Extract emails, URLs, dates, phone numbers
protonmail-cli mail extract uid:515 --json

# Full command schema for LLM tool use
protonmail-cli --help-json
```

## Global flags

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable JSON output |
| `-v, --verbose` | Verbose output |
| `-q, --quiet` | Suppress non-essential output |
| `--no-color` | Disable ANSI colors |
| `-c, --config <path>` | Custom config file path |

## Message selectors

Messages can be referenced by:

- **Sequence number**: `42` (position in mailbox, changes on delete)
- **UID**: `uid:515` (stable across sessions, recommended)

## Library usage

```typescript
import { ImapClient, loadConfig, getPassword } from 'protonmail-cli';

const cfg = await loadConfig();
const password = await getPassword('protonmail-cli', cfg.bridge.email);

const imap = new ImapClient({
  host: cfg.bridge.imap_host,
  port: cfg.bridge.imap_port,
  email: cfg.bridge.email,
  password: password!,
});

await imap.connect();
const messages = await imap.listMessages('INBOX', 10, 0, false);
console.log(messages);
await imap.disconnect();
```

## Configuration

Config file: `~/.config/protonmail-cli/config.yaml` (Linux), `~/Library/Application Support/protonmail-cli/config.yaml` (macOS), `%APPDATA%\protonmail-cli\config.yaml` (Windows).

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
  format: text
```

Bridge password is stored in the system keyring, not the config file.

## How it works

protonmail-cli connects to [Proton Bridge](https://proton.me/mail/bridge) running on localhost. Bridge provides standard IMAP/SMTP access to your ProtonMail account with end-to-end encryption handled transparently. The CLI uses STARTTLS and accepts Bridge's self-signed certificate automatically.

## Inspired by

[pm-cli](https://github.com/bscott/pm-cli) by Bryan Scott (Go).

## License

MIT
