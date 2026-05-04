export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: 'var(--brand)' }}>
          ⚡
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full animate-bounce"
              style={{ background: 'var(--brand)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading SwiftBill...</p>
      </div>
    </div>
  );
}
