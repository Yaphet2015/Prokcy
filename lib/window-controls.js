const toggleMaximize = (win) => {
  if (!win || typeof win.isMaximized !== 'function') {
    return;
  }

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
};

const bindMaximizeStateEvents = (win, onChange) => {
  if (!win || typeof onChange !== 'function') {
    return;
  }

  win.on('maximize', () => onChange(true));
  win.on('unmaximize', () => onChange(false));
};

const hideNativeWindowButtons = (win, platform = process.platform) => {
  if (
    platform === 'darwin'
    && win
    && typeof win.setWindowButtonVisibility === 'function'
  ) {
    win.setWindowButtonVisibility(false);
  }
};

module.exports = {
  toggleMaximize,
  bindMaximizeStateEvents,
  hideNativeWindowButtons,
};
