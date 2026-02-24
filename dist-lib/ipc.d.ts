import { BrowserWindow } from 'electron';
/**
 * Initialize all IPC handlers for the application
 * Sets up communication between main and renderer processes
 *
 * @param win - The main browser window
 */
declare function initIpc(win: BrowserWindow): void;
/**
 * Update rules from Whistle utility process
 * Notifies the renderer of the updated rules
 *
 * @param rules - The updated rules object
 */
declare function updateRules(rules: unknown): void;
/**
 * Notify renderer of service status changes
 *
 * @param status - Service status object with running state
 */
declare function notifyServiceStatus(status: {
    running: boolean;
}): void;
export { initIpc, updateRules, notifyServiceStatus };
//# sourceMappingURL=ipc.d.ts.map