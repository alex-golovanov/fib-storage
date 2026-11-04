export function MinViewportNotice() {
  return (
    <div
      className="flex items-center justify-center h-screen w-screen p-8 text-center"
      style={{
        background: "#0e0e11",
        color: "#c8c8d4",
        fontFamily: "'DM Mono', 'Fira Mono', monospace",
      }}
    >
      <div>
        <div className="text-[11px] uppercase tracking-[2px] mb-3" style={{ color: "#44475a" }}>
          φ Storage Grid
        </div>
        <div className="text-[18px] font-bold mb-2" style={{ color: "#e8e8f0" }}>
          This tool is designed for tablet and desktop.
        </div>
        <div className="text-[12px]" style={{ color: "#888aaa" }}>
          Please open it on a screen at least 1024 pixels wide.
        </div>
      </div>
    </div>
  );
}
