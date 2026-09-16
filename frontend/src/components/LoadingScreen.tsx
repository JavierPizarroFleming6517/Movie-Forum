export function LoadingScreen() {
  return (
    <div
      className="flex min-h-[calc(100vh-70px)] flex-col items-center justify-center bg-bg"
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="h-7 w-7 animate-spin rounded-full border border-white/20 border-t-white" />
    </div>
  );
}
