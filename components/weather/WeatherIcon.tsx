import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";

type WeatherIconProps = {
  code: number;
  size?: number;
  className?: string;
};

export default function WeatherIcon({
  code,
  size = 48,
  className = "",
}: WeatherIconProps) {
  const commonProps = {
    size,
    strokeWidth: 1.8,
    className,
    "aria-hidden": true,
  };

  /*
   * Open-Meteo weather codes:
   *
   * 0           Klar himmel
   * 1, 2        Mestadels klart / delvis molnigt
   * 3           Mulet
   * 45, 48      Dimma
   * 51–57       Duggregn
   * 61–67       Regn
   * 71–77       Snö
   * 80–82       Regnskurar
   * 85–86       Snöbyar
   * 95–99       Åska
   */

  if (code === 0) {
    return (
      <Sun
        {...commonProps}
        className={`text-yellow-300 ${className}`}
      />
    );
  }

  if (code === 1 || code === 2) {
    return (
      <CloudSun
        {...commonProps}
        className={`text-yellow-200 ${className}`}
      />
    );
  }

  if (code === 3) {
    return (
      <Cloud
        {...commonProps}
        className={`text-slate-300 ${className}`}
      />
    );
  }

  if (code === 45 || code === 48) {
    return (
      <CloudFog
        {...commonProps}
        className={`text-slate-300 ${className}`}
      />
    );
  }

  if (code >= 51 && code <= 57) {
    return (
      <CloudDrizzle
        {...commonProps}
        className={`text-blue-300 ${className}`}
      />
    );
  }

  if (
    (code >= 61 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return (
      <CloudRain
        {...commonProps}
        className={`text-blue-300 ${className}`}
      />
    );
  }

  if (
    (code >= 71 && code <= 77) ||
    (code >= 85 && code <= 86)
  ) {
    return (
      <CloudSnow
        {...commonProps}
        className={`text-sky-200 ${className}`}
      />
    );
  }

  if (code >= 95 && code <= 99) {
    return (
      <CloudLightning
        {...commonProps}
        className={`text-violet-300 ${className}`}
      />
    );
  }

  return (
    <Cloud
      {...commonProps}
      className={`text-slate-300 ${className}`}
    />
  );
}