import logo from "@/assets/spk-logo.png";

interface SpkLogoProps {
  size?: number;
  className?: string;
  /** Wrap the logo in a perfectly clipped circle frame. */
  framed?: boolean;
}

export function SpkLogo({ size = 120, className = "", framed = true }: SpkLogoProps) {
  if (!framed) {
    return (
      <img
        src={logo}
        alt="SPK Natural Farming logo"
        width={size}
        height={size}
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logo}
        alt="SPK Natural Farming logo"
        width={size}
        height={size}
        className="absolute inset-0 h-full w-full scale-[1.18] object-cover"
        style={{ objectPosition: "center" }}
      />
    </div>
  );
}
