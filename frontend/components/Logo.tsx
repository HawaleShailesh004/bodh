interface LogoProps {
  variant?: "compact" | "primary" | "dark" | "mono" | "icon";
  className?: string;
}

const pathByVariant = {
  compact: "/brand/bodh-compact.svg",
  primary: "/brand/bodh-primary.svg",
  dark: "/brand/bodh-dark.svg",
  mono: "/brand/bodh-mono.svg",
  icon: "/brand/bodh-app-icon.svg",
};

export default function Logo({ variant = "compact", className = "h-9 w-auto" }: LogoProps) {
  return <img src={pathByVariant[variant]} alt="Bodh" className={className} />;
}
