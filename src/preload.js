const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
});
