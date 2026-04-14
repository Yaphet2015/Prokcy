interface InitialThemeSnapshot {
  isDark?: boolean;
}

interface ThemeElectronApi {
  initialTheme?: InitialThemeSnapshot;
}

interface ThemeRootLike {
  classList?: {
    add: (name: string) => void;
    remove: (name: string) => void;
  };
}

export function getInitialIsDark(electron?: ThemeElectronApi): boolean {
  return !!electron?.initialTheme?.isDark;
}

export function applyDocumentThemeClass(root: ThemeRootLike | null | undefined, isDark: boolean): void {
  if (!root?.classList) {
    return;
  }

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
