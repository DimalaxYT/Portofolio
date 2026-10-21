import { categoryIconKey } from "@/lib/types";
import {
  Box,
  Clapperboard,
  Gamepad2,
  Globe,
  Shapes as ShapesIcon,
  ShieldCheck,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  box: Box,
  gamepad: Gamepad2,
  clapperboard: Clapperboard,
  shield: ShieldCheck,
  globe: Globe,
  shapes: ShapesIcon,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[categoryIconKey(name)] ?? ShapesIcon;
  return <Icon className={className} />;
}
