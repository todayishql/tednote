import React from 'react';
import * as Lucide from 'lucide-react';

interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: keyof typeof Lucide;
  size?: string | number;
}

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
  const LucideIcon = Lucide[name] as React.ElementType;
  if (!LucideIcon) return null;
  return <LucideIcon {...props} />;
};
