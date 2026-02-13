import { useEffect, useRef, useState } from 'react';
import {
  Tabs, TabsList, TabsContent, TabsTrigger,
  Button,
} from '@pikoloo/darwin-ui';
import { X } from 'lucide-react';
import { useNetwork } from '../../shared/context/NetworkContext';
import {
  HeadersTab,
  BodyTab,
  ResponseTab,
  RulesTab,
  TimelineTab,
} from './components/request-inspector';
import type { DragState } from './components/request-inspector';

export default function RequestInspector(): React.JSX.Element | null {
  const { selectedRequest, selectRequest } = useNetwork();
  const [activeTab, setActiveTab] = useState<string>('headers');
  const [inspectorHeight, setInspectorHeight] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const MIN_INSPECTOR_HEIGHT = 160;
  const MIN_TIMELINE_HEIGHT = 200;

  // Handle mouse move during resize
  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current) {
        return;
      }

      const deltaY = dragStateRef.current.startY - event.clientY;
      const parentHeight = inspectorRef.current?.parentElement?.getBoundingClientRect().height ?? Infinity;
      const maxHeight = Number.isFinite(parentHeight)
        ? Math.max(MIN_INSPECTOR_HEIGHT, parentHeight - MIN_TIMELINE_HEIGHT)
        : dragStateRef.current.startHeight + deltaY;
      const nextHeight = Math.min(
        maxHeight,
        Math.max(MIN_INSPECTOR_HEIGHT, dragStateRef.current.startHeight + deltaY),
      );

      setInspectorHeight(nextHeight);
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault();
    dragStateRef.current = {
      startY: event.clientY,
      startHeight: inspectorHeight,
    };
    setIsDragging(true);
  };

  if (!selectedRequest) {
    return null;
  }

  return (
    <div
      ref={inspectorRef}
      className="flex-none min-h-6 flex overflow-auto flex-col scrollbar-hide"
      style={{ height: `${inspectorHeight}px` }}
    >
      {/* Resize handle */}
      <button
        type="button"
        className="group h-1 w-full cursor-row-resize shrink-0 flex items-center"
        onMouseDown={startResize}
        aria-label="Resize request inspector"
      >
        <div className="group-hover:scale-y-400 h-px w-full bg-zinc-200/80 hover:bg-blue-400/70 dark:bg-zinc-800/80 dark:hover:bg-blue-500/70" />
      </button>

      {/* Tabs */}
      <Tabs
        className="h-full flex flex-col"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div
          className={[
            'flex items-center justify-between shrink-0 p-2 pb-0',
          ].join(' ')}
        >
          <TabsList>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="body">Request Body</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <Button
            className="-translate-y-1"
            variant="ghost"
            size="sm"
            onClick={() => selectRequest(null)}
            leftIcon={<X className="w-4 h-4 hover:dark:text-zinc-950" />}
            aria-label="Close request inspector"
          />
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent className="h-full min-h-0" value="headers">
            <HeadersTab request={selectedRequest} />
          </TabsContent>
          <TabsContent className="h-full min-h-0" value="body">
            <BodyTab request={selectedRequest} />
          </TabsContent>
          <TabsContent className="h-full min-h-0" value="response">
            <ResponseTab request={selectedRequest} />
          </TabsContent>
          <TabsContent className="h-full min-h-0" value="rules">
            <RulesTab request={selectedRequest} />
          </TabsContent>
          <TabsContent className="h-full min-h-0" value="timeline">
            <TimelineTab request={selectedRequest} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
