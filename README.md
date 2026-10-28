# Gemini Voice for DeepSeek Harness

English | [简体中文](README.zh-CN.md)

A Gemini transcription adapter for the **official experimental voice input plugin in DeepSeek Harness**. Keep the official microphone, waveform, recording controls, and draft insertion while using Gemini for speech recognition.

This adapter provides API key settings and optional personal vocabulary groups. It does not add a second microphone or replace the official recording interface.

## Requirements

- DeepSeek Harness desktop with `@deepseek-ai/dsh-experimental-voice-input-bundle` available.
- Node.js 20 or later and npm.
- A Google AI Studio API key with access to `gemini-3.5-transcribe-live`.

Tested on Windows. Other operating systems have not been verified. The adapter currently displays its own settings and error messages in Chinese; the navigation names below are English descriptions of those controls.

## Installation

1. In DeepSeek Harness, open **Plugins → Experimental** and enable the official voice input plugin.
2. Clone this repository and build the adapter:

   ```sh
   git clone https://github.com/SparklingAstronaut/dsh-gemini-voice.git
   cd dsh-gemini-voice
   npm ci
   npm run build
   ```

3. Add this directory as a local plugin in Harness and enable it. Keep the directory in place while the plugin is installed.
4. Fully exit Harness through its application menu, then reopen it. Closing the window alone may leave the application running.
5. Open **Settings → Voice** and save your Google AI Studio API key.
6. In the official voice input plugin configuration, select the **Gemini** recognition provider. You do not need to download the SenseVoice model to use Gemini.

Version 0.3.0 and later require the official voice input plugin. Upgrading from an older version removes this adapter's standalone recording interface while retaining the saved API key and vocabulary. Version 0.3.1 moves configuration into a dedicated **Voice** settings section, with a microphone icon, alongside General settings.

## How it works

1. Click the official microphone and speak.
2. Stop the recording.
3. The official interface submits the completed WAV recording to this adapter.
4. The adapter sends PCM audio chunks through the Gemini Live API's `BidiGenerateContent` WebSocket endpoint using `gemini-3.5-transcribe-live`.
5. The official interface inserts the completed transcript into your draft without sending the message.

The current recording limit is two minutes. Upload and transcription happen after recording stops, so there is a short wait before text appears. This is not a frontend that displays text while you speak. It still uses the Live API, not file transcription or `generateContent`.

Transcription uses **VERBATIM** mode. SMART rewriting and formatting are disabled. Language selection follows the official voice settings, with automatic detection as the default. Cancellation terminates the cloud request; failures do not silently route audio to another provider.

Quotas and billing depend on your Google API project's settings for the Live model. Gemini web subscriptions and API quotas are separate.

## Personal vocabulary

Create a vocabulary tailored to your own usage rather than copying someone else's list. In **Settings → Voice → Personal vocabulary**, enter one term per line.

- Create, rename, or remove up to 10 groups.
- Each group supports up to 100 terms.
- Only the selected group is used when vocabulary is enabled.
- Saved changes apply to the next transcription without restarting.
- Blank lines and duplicate terms are removed on save.

Vocabulary biases recognition toward specific spellings. It does not force replacements, enable SMART formatting, read conversations, or automatically learn corrections. More terms do not necessarily improve accuracy: use relevant proper nouns and compare results with vocabulary enabled and disabled.

**No personal vocabulary is included in this repository.** When enabled, only the selected group's terms are sent to Google to assist recognition.

## Local configuration and privacy

Configuration is stored outside the plugin repository:

| File | Purpose |
| --- | --- |
| `~/.dsh/gemini-voice/api-key.txt` | Gemini API key |
| `~/.dsh/gemini-voice/vocabulary.json` | Personal vocabulary and group selection |

These are local files, not entries in an operating system credential vault. Protect your account and file permissions, and never commit or share these files.

The shared `.dsh` location avoids Windows AppData virtualization causing different launchers to see different configurations. A readable legacy AppData key is migrated only when the new key file does not exist. A nonempty `GEMINI_API_KEY` environment variable takes precedence over the saved key; saving a key in the interface does not override that variable.

This adapter does not write recordings to files. Audio is sent to Google after recording stops. Settings endpoints retain Harness authentication and restrict access to loopback addresses and same-origin requests. The API key is never returned to the frontend.

## Compatibility and updates

The adapter uses the official experimental `speechToText.register()` interface without modifying Harness installation files. Changes to that interface or the settings extension points may require an adapter update. The Voice navigation icon also uses a narrowly scoped style adjustment for the current settings layout.

After updating Harness, check that the Gemini provider is available and test a short recording. To disable this adapter, first select another available recognition provider in the official voice input configuration.

## Development and validation

```sh
npm run build
npm test
```

The build generates the settings frontend. Tests cover shared configuration paths, vocabulary selection and validation, WAV validation, the Live API protocol, the official result format, and cancellation cleanup. Server changes require fully exiting and reopening Harness.

The registered provider has been tested with synthesized Chinese speech. Actual microphone recording through the official interface has also been verified on Windows, including successful draft insertion after restarting. Accuracy and latency depend on speech, recording conditions, network performance, and service availability.

## Credits and license

The earlier standalone frontend drew on the MIT-licensed [forrestahha/dsh-voice-input](https://github.com/forrestahha/dsh-voice-input). That recording frontend has been removed; the MIT notice remains in [LICENSE](LICENSE). This project does not copy or modify the official recording UI code.

This is a community adapter, not an official DeepSeek, Google, or OpenAI product.
