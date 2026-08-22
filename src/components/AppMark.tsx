export function AppMark({ size = 40 }: { size?: number }) {
  return (
    <span className="app-mark" style={{ width: size, height: size }} aria-hidden="true">
      <img src="/brand/swifttip-icon.svg" alt="" width={size} height={size} />
    </span>
  );
}
