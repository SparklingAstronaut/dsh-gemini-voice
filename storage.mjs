import {join} from 'node:path';

export function environmentValue(env, name) {
  const key = Object.keys(env).find(k => k.toUpperCase() === name.toUpperCase());
  return key ? (env[key] || '').trim() : '';
}

// Packaged Windows launchers can virtualize AppData into their own LocalCache.
// Use the existing user DSH directory, shared by terminal and desktop launches.
export function configDirectory(platform, env, home) {
  // Explicit opt-in keeps existing desktop credentials in their original location.
  return environmentValue(env, 'DSH_GEMINI_VOICE_HOME') || join(home, '.dsh', 'gemini-voice');
}
