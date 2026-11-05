const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const previous = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(previous) ? previous : previous ? [previous] : []),
  /[/\\]\.build[/\\]/,
  /[/\\]coverage[/\\]/,
  /[/\\]modules[/\\]tv-remote-native[/\\]android[/\\]build[/\\]/,
];
module.exports = config;
