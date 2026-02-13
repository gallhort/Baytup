'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';

interface StepTransitionProps {
  stepKey: string;
  children: ReactNode;
}

export default function StepTransition({ stepKey, children }: StepTransitionProps) {
  const [visible, setVisible] = useState(false);
  const prevKey = useRef(stepKey);

  useEffect(() => {
    if (stepKey !== prevKey.current) {
      setVisible(false);
      const t = setTimeout(() => {
        prevKey.current = stepKey;
        setVisible(true);
      }, 50);
      return () => clearTimeout(t);
    } else {
      setVisible(true);
    }
  }, [stepKey]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  );
}
