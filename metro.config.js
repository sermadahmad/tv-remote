const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);
// Router context transforms must stay distinct across worktrees sharing node_modules.
config.cacheVersion = `${config.cacheVersion}:${__dirname}`;
if (process.env.TVREMOTE_DISABLE_WATCHMAN === '1') {
  config.resolver.useWatchman = false;
}
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const previous = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(previous) ? previous : previous ? [previous] : []),
  ...['ios', 'android'].map(
    (folder) =>
      new RegExp(`^${escapePattern(path.join(__dirname, folder))}[/\\\\]`),
  ),
  /[/\\]\.build[/\\]/,
  /[/\\](?:\.swiftpm|\.cxx|\.gradle)[/\\]/,
  /[/\\]ios[/\\](?:Pods|build)(?:[/\\]|$)/,
  /[/\\]android[/\\](?:app[/\\])?(?:build|\.cxx|\.gradle)(?:[/\\]|$)/,
  /[/\\]coverage[/\\]/,
  /[/\\]modules[/\\]tv-remote-native[/\\]android[/\\]build[/\\]/,
];
module.exports = config;
