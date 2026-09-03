# OllamaRunner agent guide

OllamaRunner is a GNOME Shell extension for Shell 46–48. It polls Ollama’s local `/api/ps` endpoint every three seconds, shows red when no model is loaded and green when at least one model is loaded, and displays model/RAM/VRAM details on hover.

## Repository layout

- `extension.js`: GNOME Shell indicator, polling, icon state, tooltip lifecycle and cleanup.
- `lib/status.js`: pure parsing, formatting and status/color decisions.
- `test/status.test.js`: Node test suite for status logic and static asset/integration checks.
- `icons/ollama-symbolic.svg`: recolorable 16×16 symbolic panel icon.
- `stylesheet.css`: status-color fallback and tooltip styling.
- `metadata.json`: extension UUID, supported Shell versions and release version.
- `ollama-status@arnaudmetois.shell-extension.zip`: generated installable archive.

## Dev environment

- Node.js is needed only for tests; there are no npm dependencies and no install step.
- Runtime dependencies are GNOME Shell 46–48, GJS libraries `Gio`, `GLib`, `GObject`, `Soup`, and `St`, plus Ollama on its standard loopback endpoint.
- `zip`, `unzip`, and `gnome-extensions` are used for packaging and local installation.

## Build and test

Run the complete test suite:

    npm test

No separate lint or format command is configured. Before packaging, `npm test` must pass.

Rebuild the extension archive from the repository root:

    rm -f ollama-status@arnaudmetois.shell-extension.zip
    zip ollama-status@arnaudmetois.shell-extension.zip metadata.json extension.js stylesheet.css icons/ollama-symbolic.svg lib/status.js
    unzip -t ollama-status@arnaudmetois.shell-extension.zip

Install and enable the archive:

    gnome-extensions install --force ollama-status@arnaudmetois.shell-extension.zip
    gnome-extensions enable ollama-status@arnaudmetois

Inspect runtime state and errors:

    gnome-extensions info ollama-status@arnaudmetois
    gdbus call --session --dest org.gnome.Shell.Extensions --object-path /org/gnome/Shell/Extensions --method org.gnome.Shell.Extensions.GetExtensionErrors 'ollama-status@arnaudmetois'

## Conventions

- Use ES modules and GNOME `gi://`/`resource:///` imports in `extension.js`.
- Keep Ollama payload parsing and display decisions as exported pure functions in `lib/status.js`; keep GNOME actor/session code in `extension.js`.
- JavaScript uses four-space indentation, semicolons, single quotes, and braces on the same line.
- Invalid JSON, malformed payloads, HTTP errors and request exceptions map to `stoppedStatus()`.
- Track GNOME resources explicitly: cancel requests, remove GLib sources, disconnect signals, remove chrome actors, abort Soup sessions, then call `super.destroy()`.
- Add tests with `node:test` and strict assertions in `test/status.test.js`.

## Pitfalls

- GNOME Shell on Wayland caches extension JavaScript. Disable/enable may refresh CSS but still run the old JS; log out and back in after JS or metadata changes.
- Keep `metadata.json` UUID and archive name as `ollama-status@arnaudmetois`; changing the UUID creates a separate extension identity.
- The ZIP is generated. Edit source files, rebuild it, and verify it with `unzip -t`; do not edit archive contents directly.
- `http://127.0.0.1:11434/api/ps` is intentionally loopback-only and is Ollama’s standard local API, not a machine-specific filesystem path.
- Use `extension.path` for packaged assets; never embed a developer home directory or absolute repository path.
