'use client';

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
}

export default function ShareButton({ title, text, url, className = '' }: ShareButtonProps) {
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.origin : 'https://aangan.app');
  const shareText = `${text} ${shareUrl}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // User cancelled — ignore
      }
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(shareText)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1.5 min-h-dadi px-3 font-body text-base text-brown-light hover:text-mehndi-green hover:bg-green-50 rounded-lg transition-colors ${className}`}
      aria-label="शेयर करें — Share"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      <span>शेयर</span>
    </button>
  );
}
