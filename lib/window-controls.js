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

module.exports = {
  toggleMaximize,
  bindMaximizeStateEvents,
};
