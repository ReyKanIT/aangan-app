export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex items-start justify-center pt-10 px-4 pb-10">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
