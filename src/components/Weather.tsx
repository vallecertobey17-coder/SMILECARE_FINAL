import { useEffect, useState } from 'react'
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Droplets, Wind, Thermometer, SunMedium, RefreshCw } from 'lucide-react'

/** Live weather for Taytay, Rizal from Open-Meteo (free, no API key). */
const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=14.5692&longitude=121.1325&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,uv_index&timezone=Asia%2FManila'

type Now = { temp: number; feels: number; humidity: number; wind: number; code: number; uv: number; time: string }

/** WMO weather codes → label + icon */
function describe(code: number) {
  if (code === 0) return { label: 'Sunny', Icon: Sun }
  if (code <= 2) return { label: 'Partly Cloudy', Icon: CloudSun }
  if (code === 3) return { label: 'Cloudy', Icon: Cloud }
  if (code <= 48) return { label: 'Foggy', Icon: CloudFog }
  if (code <= 57) return { label: 'Drizzle', Icon: CloudDrizzle }
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Rainy', Icon: CloudRain }
  if (code >= 95) return { label: 'Thunderstorm', Icon: CloudLightning }
  return { label: 'Cloudy', Icon: Cloud }
}

export function Weather() {
  const [now, setNow] = useState<Now | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    const ctl = new AbortController()
    setState('loading')
    fetch(URL, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        if (!alive) return
        const c = j.current
        setNow({ temp: c.temperature_2m, feels: c.apparent_temperature, humidity: c.relative_humidity_2m, wind: c.wind_speed_10m, code: c.weather_code, uv: c.uv_index, time: c.time })
        setState('ok')
      })
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
      ctl.abort()
    }
  }, [tick])

  if (state === 'error')
    return (
      <div className="weather weather-off">
        <Cloud size={34} />
        <b>Weather unavailable</b>
        <small>Live weather couldn't be loaded. Check your connection.</small>
        <button className="btn btn-white sm" onClick={() => setTick((t) => t + 1)}>
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    )
  if (!now)
    return (
      <div className="weather weather-off">
        <CloudSun size={34} />
        <small>Loading weather…</small>
      </div>
    )

  const { label, Icon } = describe(now.code)
  const hot = now.feels >= 33
  return (
    <div className="weather">
      <div className="weather-top">
        <span>
          <b>Taytay, Rizal</b>
          <small>{label}</small>
        </span>
        <Icon size={46} />
      </div>
      <div className="weather-temp">
        {Math.round(now.temp)}
        <sup>°C</sup>
      </div>
      <small className="weather-feels">Feels like {Math.round(now.feels)}°C</small>
      <div className="weather-grid">
        <span><Droplets size={18} /><b>{Math.round(now.humidity)}%</b><small>Humidity</small></span>
        <span><Wind size={18} /><b>{Math.round(now.wind)} km/hr</b><small>Wind</small></span>
        <span><SunMedium size={18} /><b>{Math.round(now.uv)}</b><small>UV Index</small></span>
      </div>
      {hot && (
        <p className="weather-tip">
          <Thermometer size={16} /> It's hot today. Bring water and an umbrella when visiting the Rolling Botika.
        </p>
      )}
      <small className="weather-src">Updated {new Date(now.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} • Open-Meteo</small>
    </div>
  )
}
