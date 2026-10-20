import React, { useEffect, useRef } from 'react';
import { DemonicEyeManager } from '../scene/DemonicEyeManager';

export const DemonicEyeCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<DemonicEyeManager | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new DemonicEyeManager(mountRef.current);
    managerRef.current = manager;

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full select-none touch-none pointer-events-auto"
    />
  );
};
