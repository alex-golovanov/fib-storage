import { useEffect, useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  trigger: (props: { onClick: () => void; isOpen: boolean }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}

export function Popover({ trigger, children, align = "right" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      {trigger({ onClick: () => setOpen((v) => !v), isOpen: open })}
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[200px]"
          style={
            {
              [align]: 0,
              background: "#15161c",
              border: "1px solid #2e3040",
              padding: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            } as React.CSSProperties
          }
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
