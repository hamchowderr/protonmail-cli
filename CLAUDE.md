# protonmail-cli

TypeScript ProtonMail CLI via Proton Bridge IMAP/SMTP.

## Stack

- TypeScript, ESM (`"type": "module"`)
- Commander.js v14 for CLI
- imapflow (IMAP), nodemailer (SMTP), mailparser (parsing)
- @napi-rs/keyring for system keyring (replaces deprecated keytar)
- yaml for config, chalk v5 for color, columnify for tables
- tsup for build (dual ESM+CJS), Vitest for tests

## Build & Test

```bash
npm run build      # tsup → dist/
npm run typecheck   # tsc --noEmit
npm test           # vitest run (48 tests)
npm run dev        # tsx watch src/cli.ts
```

## Architecture

```
src/
├── cli.ts              ← CLI entry (Commander program)
├── index.ts            ← Library entry (public exports)
├── imap/               ← ImapClient wrapping imapflow
├── smtp/               ← SmtpClient wrapping nodemailer
├── config/             ← YAML config + keyring + idempotency
├── contacts/           ← Local JSON address book
├── output/             ← Formatter (JSON/text/table/color)
└── commands/           ← All CLI command handlers
    ├── config.ts       ← config init|show|set|validate|doctor
    ├── mail/           ← 15 mail commands + draft/ + label/
    ├── mailbox/        ← list|create|delete
    ├── contacts/       ← list|search|add|remove
    ├── version.ts
    └── help-json.ts
```

## Key Patterns

- Every command gets a `CommandContext` via `makeContext()` (config + formatter + globals)
- Global flags (`--json`, `--verbose`, etc.) accessed via `cmd.optsWithGlobals()`
- IMAP commands: create ImapClient → connect → try/finally disconnect
- `--help-json` intercepted before Commander parses argv
- All message selectors support `uid:<uid>` (stable) or sequence number

## Config

- Config: `%APPDATA%\protonmail-cli\config.yaml` (Win) / `~/.config/protonmail-cli/` (Linux)
- Password: system keyring via @napi-rs/keyring
- Idempotency: `configDir()/idempotency.json` (24h TTL)
- Contacts: `configDir()/contacts.json`

## Publishing

```bash
npm version patch
npm publish --access public
```

The `prepublishOnly` script runs build + typecheck + tests automatically.
