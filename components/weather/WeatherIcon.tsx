import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Snowflake,
  Sun,
} from "lucide-react";

type WeatherIconProps = {
  code: number;
  size?: number;
  className?: string;
};

export default function WeatherIcon({
  code,
  size = 32,
  className = "",
}: WeatherIconProps) {
  if (code === 0) {
    return <Sun size={size} className={`text-amber-300 ${className}`} />;
  }

  if (code === 1 || code === 2) {
    return <CloudSun size={size} className={`text-amber-200 ${className}`} />;
  }

  if (code === 3) {
    return <Cloud size={size} className={`text-slate-300 ${className}`} />;
  }

  if (code === 45 || code === 48) {
    return <CloudFog size={size} className={`text-slate-300 ${className}`} />;
  }

  if (code >= 51 && code <= 57) {
    return (
      <CloudDrizzle size={size} className={`text-sky-300 ${className}`} />
    );
  }

  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return <CloudRain size={size} className={`text-blue-300 ${className}`} />;
  }

  if (code >= 71 && code <= 77) {
    return <CloudSnow size={size} className={`text-cyan-100 ${className}`} />;
  }

  if (code === 85 || code === 86) {
    return <Snowflake size={size} className={`text-cyan-100 ${className}`} />;
  }

  if (code >= 95 && code <= 99) {
    return (
      <CloudLightning
        size={size}
        className={`text-violet-300 ${className}`}
      />
    );
  }

  return <Cloud size={size} className={`text-slate-300 ${className}`} />;
}