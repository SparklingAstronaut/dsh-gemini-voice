import {join} from 'node:path';

export function environmentValue(env, name) {
  const key = Object.keys(env).find(k => k.toUpperCase() === name.toUpperCase());
  return key ? (env[key] || '').trim() : '';
}

// A desktop launch can have a different environment from a terminal launch.
// Never fall back to cwd: that silently changes the credential location.
export function configDirectory(platform, env, home) {
  const base = platform === 'win32'
    ? environmentValue(env, 'LOCALAPPDATA') || join(home, 'AppData', 'Local')
    : platform === 'darwin'
      ? join(home, 'Library', 'Application Support')
      : environmentValue(env, 'XDG_CONFIG_HOME') || join(home, '.config');
  return join(base, 'DeepSeekHarnessGeminiVoice');
}
