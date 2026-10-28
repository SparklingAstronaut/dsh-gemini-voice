import {join} from 'node:path';

export function environmentValue(env, name) {
  const key = Object.keys(env).find(k => k.toUpperCase() === name.toUpperCase());
  return key ? (env[key] || '').trim() : '';
}

// Packaged Windows launchers can virtualize AppData into their own LocalCache.
// Use the existing user DSH directory, shared by terminal and desktop launches.
export function configDirectory(platform, env, home) {
  return join(home, '.dsh', 'gemini-voice');
}
