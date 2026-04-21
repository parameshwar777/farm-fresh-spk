import logo from "@/assets/spk-logo.png";

interface SpkLogoProps {
  size?: number;
  className?: string;
}

export function SpkLogo({ size = 120, className = "" }: SpkLogoProps) {
  return (
    <img
      src={logo}
      alt="SPK Natural Farming logo"
      width={size}
      height={size}
      className={`rounded-full object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
