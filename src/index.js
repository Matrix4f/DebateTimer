const {app, BrowserWindow, Menu, globalShortcut, ipcMain} = require('electron');
const electron = require('electron');
const path = require('path');
const url = require('url');
const release = true;
const WINDOW_HEIGHT = !release ? 215 : 156;

var window = null;

app.once('ready', () => {
const electronScreen = electron.screen;

  globalShortcut.register('Alt+Shift+R', function() {
    window.webContents.send('keyboard-shortcut', 'pause-resume');
  });
  window = new BrowserWindow({
    width: 250,
    height: WINDOW_HEIGHT,
    backgroundColor: "#D6D8DC",
    show: false,
    alwaysOnTop: true,
    frame: !release,
    resizable: !release
  });

  window.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  if (release)
    Menu.setApplicationMenu(null);

  window.once('ready-to-show', () => {
    window.show();
    window.setPosition(0, electronScreen.getPrimaryDisplay().size.height - WINDOW_HEIGHT);
  });

  window.once('closed', () => {
    process.exit(0);
  });
});
