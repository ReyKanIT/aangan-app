import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl mb-4">🏠</div>
      <h1 className="font-heading text-4xl text-haldi-gold mb-2">
        पेज नहीं मिला
      </h1>
      <p className="font-body text-lg text-brown-light mb-1">
        Page Not Found
      </p>
      <p className="font-body text-base text-brown-light mb-8 max-w-md">
        यह पेज मौजूद नहीं है या हटा दिया गया है।
        <br />
        This page does not exist or has been removed.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-8 py-4 bg-haldi-gold text-white font-body font-semibold text-lg rounded-2xl shadow-md hover:bg-haldi-gold-dark transition-colors min-h-[52px]"
      >
        आँगन होम पर जाएं — Go Home
      </Link>
    </div>
  );
}
