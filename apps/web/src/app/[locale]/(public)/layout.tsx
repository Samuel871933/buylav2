import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="relative flex-1">
        {/* Subtle gradient layer */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 0% 0%, #8b5cf6 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, #3b82f6 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
