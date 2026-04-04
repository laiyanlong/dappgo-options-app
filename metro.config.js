const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix zustand ESM import.meta issue on web
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
