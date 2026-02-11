import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { RuleGroup } from '../../../shared/context/RulesContext';

interface PromptResult {
  title: string;
  message: string;
  defaultValue: string;
}

interface ShowPromptFunction {
  (options: PromptResult): Promise<string | null>;
}

interface ReorderResult {
  success: boolean;
  message?: string;
}

interface ReorderFunction {
  (newOrder: RuleGroup[]): Promise<ReorderResult>;
}

interface UseRuleGroupsDragDropParams {
  ruleGroups: RuleGroup[];
  reorderGroups: ReorderFunction;
  prompt: ShowPromptFunction;
}

export function useRuleGroupsDragDrop({ ruleGroups, reorderGroups, prompt }: UseRuleGroupsDragDropParams) {
  const [localRuleGroups, setLocalRuleGroups] = useState<RuleGroup[]>(ruleGroups);
  const [isReordering, setIsReordering] = useState(false);
  const latestOrderRef = useRef<RuleGroup[]>(ruleGroups);
  const dragSettledRef = useRef(false);

  // Sync local state when not reordering
  useEffect(() => {
    if (!isReordering) {
      setLocalRuleGroups(ruleGroups);
      latestOrderRef.current = ruleGroups;
    }
  }, [ruleGroups, isReordering]);

  // Handle drag-and-drop reordering
  const handleReorder = useCallback((newOrder: RuleGroup[]) => {
    setLocalRuleGroups(newOrder);
    latestOrderRef.current = newOrder;
  }, []);

  const handleDragStart = useCallback(() => {
    dragSettledRef.current = false;
    setIsReordering(true);
  }, []);

  const handleDragEnd = useCallback(async () => {
    dragSettledRef.current = true;
    setIsReordering(false);

    const result = await reorderGroups(latestOrderRef.current).catch((err: Error) => ({
      success: false,
      message: err?.message || 'Failed to reorder groups',
    }));

    if (!result.success) {
      await prompt({
        title: 'Error',
        message: result.message ?? 'Failed to reorder groups',
        defaultValue: '',
      });
    }
  }, [reorderGroups, prompt]);

  const handleDragCancel = useCallback(() => {
    dragSettledRef.current = true;
    setIsReordering(false);
  }, []);

  // Fallback cleanup for drag operations that don't properly end
  useEffect(() => {
    if (!isReordering) {
      return undefined;
    }

    let fallbackTimer: number | null = null;

    const stopReordering = () => {
      if (fallbackTimer !== null) {
        return;
      }

      // Defer to avoid racing with Framer's drop/reorder callbacks
      fallbackTimer = window.setTimeout(() => {
        fallbackTimer = null;
        if (!dragSettledRef.current) {
          setIsReordering(false);
        }
      }, 0);
    };

    window.addEventListener('pointerup', stopReordering, true);
    window.addEventListener('pointercancel', stopReordering, true);
    window.addEventListener('blur', stopReordering);

    return () => {
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      window.removeEventListener('pointerup', stopReordering, true);
      window.removeEventListener('pointercancel', stopReordering, true);
      window.removeEventListener('blur', stopReordering);
    };
  }, [isReordering]);

  return useMemo(() => ({
    localRuleGroups,
    isReordering,
    handleReorder,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }), [localRuleGroups, isReordering, handleReorder, handleDragStart, handleDragEnd, handleDragCancel]);
}
