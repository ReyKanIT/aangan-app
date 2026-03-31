interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ emoji = '📭', title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="font-heading text-xl text-brown mb-1">{title}</h3>
      {subtitle && <p className="font-body text-brown-light text-sm mb-4">{subtitle}</p>}
      {action}
    </div>
  );
}
