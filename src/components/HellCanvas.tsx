import React, { useEffect, useRef } from 'react';
import { HellSceneManager, HellSceneCallbacks } from '../scene/HellSceneManager';

interface HellCanvasProps {
  onDiveProgress: (progress: number) => void;
  onDiveComplete: () => void;
  sceneManagerRef: React.MutableRefObject<HellSceneManager | null>;
}

export const HellCanvas: React.FC<HellCanvasProps> = ({
  onDiveProgress,
  onDiveComplete,
  sceneManagerRef,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef<HellSceneCallbacks>({
    onDiveProgress,
    onDiveComplete,
  });

  // Keep latest callbacks without re-triggering effect
  useEffect(() => {
    callbacksRef.current = {
      onDiveProgress,
      onDiveComplete,
    };
  }, [onDiveProgress, onDiveComplete]);

  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new HellSceneManager(mountRef.current, {
      onDiveProgress: (p) => callbacksRef.current.onDiveProgress?.(p),
      onDiveComplete: () => callbacksRef.current.onDiveComplete?.(),
    });

    sceneManagerRef.current = manager;

    return () => {
      manager.destroy();
      sceneManagerRef.current = null;
    };
  }, [sceneManagerRef]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none"
    />
  );
};
