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
};

export default function WeatherIcon({
  code,
  size = 48,
}: WeatherIconProps) {
  if (code === 0) {
    return <Sun size={size} className="text-yellow-300" />;
  }

  if (code === 1 || code === 2) {
    return <CloudSun size={size} className="text-yellow-200" />;
  }

  if (code === 3) {
    return <Cloud size={size} className="text-slate-300" />;
  }

  if (code === 45 || code === 48) {
    return <CloudFog size={size} className="text-slate-300" />;
  }

  if (code >= 51 && code <= 57) {
    return <CloudDrizzle size={size} className="text-blue-300" />;
  }

  if (
    (code >= 61 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return <CloudRain size={size} className="text-blue-300" />;
  }

  if (
    (code >= 71 && code <= 77) ||
    (code >= 85 && code <= 86)
  ) {
    return <CloudSnow size={size} className="text-cyan-200" />;
  }

  if (code >= 95 && code <= 99) {
    return <CloudLightning size={size} className="text-purple-300" />;
  }

  return <Cloud size={size} className="text-slate-300" />;
}