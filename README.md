# OllamaRunner

OllamaRunner is a small GNOME Shell status indicator for local Ollama models.

- Red icon: Ollama is unavailable or no model is loaded.
- Green icon: at least one model is loaded.
- Hover tooltip: loaded model names, RAM/VRAM usage, and total memory.
- Automatic refresh every three seconds.

## Requirements

- GNOME Shell 46, 47, or 48
- Ollama using its standard local API at `127.0.0.1:11434`
- `gnome-extensions` for installation

Node.js is only required to run the tests. The extension has no npm dependencies.

## Install

Clone the repository and install the included extension archive:

```sh
git clone https://github.com/LeVibeux/OllamaRunner.git
cd OllamaRunner
gnome-extensions install --force ollama-status@arnaudmetois.shell-extension.zip
gnome-extensions enable ollama-status@arnaudmetois
```

Check that GNOME loaded it:

```sh
gnome-extensions info ollama-status@arnaudmetois
```

GNOME Shell on Wayland may keep the previous JavaScript module after disabling and enabling an extension. Log out and back in after installing an update if the displayed behavior does not change.

## Build

Run the tests:

```sh
npm test
```

Rebuild and verify the installable archive:

```sh
rm -f ollama-status@arnaudmetois.shell-extension.zip
zip ollama-status@arnaudmetois.shell-extension.zip \
  metadata.json extension.js stylesheet.css \
  icons/ollama-symbolic.svg lib/status.js
unzip -t ollama-status@arnaudmetois.shell-extension.zip
```

## How it works

The extension requests `http://127.0.0.1:11434/api/ps` and parses Ollama's list of loaded models. Network errors and malformed responses are treated as an unavailable Ollama service. Model names are rendered as plain text rather than markup.

## Privacy and security

OllamaRunner:

- communicates only with Ollama through the loopback interface;
- does not send telemetry or contact external services;
- does not execute commands or write files;
- does not store model information, credentials, or configuration.

The repository and packaged ZIP contain no machine-specific filesystem paths or credentials.

## Project structure

- `extension.js` — GNOME Shell indicator, polling, tooltip, and cleanup
- `lib/status.js` — response parsing and display formatting
- `test/status.test.js` — Node test suite
- `stylesheet.css` — icon-state and tooltip styling
- `icons/ollama-symbolic.svg` — panel icon
- `metadata.json` — GNOME Shell extension metadata

## Contributing

See [`AGENTS.md`](AGENTS.md) for the verified development commands, code conventions, and GNOME Shell reload pitfalls used in this repository.
