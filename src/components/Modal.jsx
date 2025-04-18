import { useEffect, useRef } from "react";

export default function Modal({ visible, children }) {

  const divRef = useRef(null);

  useEffect(() => {
    if (visible) {
      divRef.current.style.display = 'grid';
      divRef.current.offsetHeight;
      divRef.current.style.transform = 'translateY(0)';
    } else {
      divRef.current.style.transform = 'translateY(100%)';
      const timer = setTimeout(() => {
        if (!visible) {
          divRef.current.style.display = 'none';
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <div
      ref={divRef}
      style={{
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.01), rgba(0, 0, 0, 0.8)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2,
        transform: 'translateY(100%)',
        transition: 'transform 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
        display: 'none',
        placeItems: 'center',
      }}
    >
      {children}
    </div>
  );
}
