import { useCallback, useEffect, useRef, useState } from 'react';

export function useRuleGroupsDragDrop({ ruleGroups, reorderGroups, prompt }) {
  const [localRuleGroups, setLocalRuleGroups] = useState(ruleGroups);
  const [isReordering, setIsReordering] = useState(false);
  const latestOrderRef = useRef(ruleGroups);
  const dragSettledRef = useRef(false);

  // Sync local state when not reordering
  useEffect(() => {
    if (!isReordering) {
      setLocalRuleGroups(ruleGroups);
      latestOrderRef.current = ruleGroups;
    }
  }, [ruleGroups, isReordering]);

  // Handle drag-and-drop reordering
  const handleReorder = useCallback((newOrder) => {
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

    const result = await reorderGroups(latestOrderRef.current).catch((err) => ({
      success: false,
      message: err?.message || 'Failed to reorder groups',
    }));

    if (!result.success) {
      await prompt({
        title: 'Error',
        message: result.message || 'Failed to reorder groups',
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

    let fallbackTimer = null;

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

  return {
    localRuleGroups,
    isReordering,
    handleReorder,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
