export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center pt-10 px-4 pb-10">
      <div className="w-full max-w-md flex-1">
        {children}
      </div>
      <p className="font-body text-xs text-brown-light mt-8">Aangan v0.8.0</p>
    </div>
  );
}
