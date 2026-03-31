import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface AvatarCircleProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export default function AvatarCircle({ src, name, size = 40, className }: AvatarCircleProps) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div
      className={cn('relative rounded-full overflow-hidden bg-haldi-gold flex items-center justify-center flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={name ?? 'Avatar'} fill className="object-cover" />
      ) : (
        <span className="text-white font-body font-bold" style={{ fontSize: size * 0.38 }}>
          {initials}
        </span>
      )}
    </div>
  );
}
