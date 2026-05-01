import MobileShell from '@/components/MobileShell'

export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#030507]">
      {/* Outer glow frame */}
      <div
        className="relative w-full max-w-[430px] h-dvh sm:h-[812px] sm:rounded-[44px] overflow-hidden"
        style={{
          boxShadow:
            '0 0 0 1px rgba(34,211,238,0.08), 0 0 60px rgba(34,211,238,0.05), 0 40px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Subtle edge glow */}
        <div
          className="absolute inset-0 pointer-events-none z-50 sm:rounded-[44px]"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(34,211,238,0.06)',
          }}
        />
        <MobileShell />
      </div>
    </main>
  )
}
