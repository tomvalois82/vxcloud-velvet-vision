import { LucideIcon, Clock } from 'lucide-react';

interface PlaceholderCardProps {
  title: string;
  icon?: LucideIcon;
}

export function PlaceholderCard({ title, icon: Icon = Clock }: PlaceholderCardProps) {
  return (
    <div className="flex-1 bg-card/50 rounded-lg p-4 transition-all duration-300 hover:bg-card/70">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <Icon className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-xs text-center">Em desenvolvimento</span>
      </div>
    </div>
  );
}
