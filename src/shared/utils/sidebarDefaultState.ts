export const DEFAULT_SIDEBAR_COLLAPSED = false;

export interface SidebarDefaultSettings {
  sidebarDefaultCollapsed?: unknown;
}

export const normalizeSidebarDefaultCollapsed = (value: unknown): boolean =>
  value === true;

export const getInitialSidebarCollapsed = (
  settings?: SidebarDefaultSettings | null,
): boolean =>
  settings && 'sidebarDefaultCollapsed' in settings
    ? normalizeSidebarDefaultCollapsed(settings.sidebarDefaultCollapsed)
    : DEFAULT_SIDEBAR_COLLAPSED;
