import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Search,
  MapPin,
  Wind,
  Droplets,
  ThermometerSun,
  Play,
  Pause,
  LayoutGrid,
  LocateFixed,
  BarChart3,
  Lightbulb,
  User,
  History,
  AlertTriangle,
  CalendarClock,
  PlayCircle,
  Shirt,
  type LucideIcon,
} from 'lucide-react';
import { XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

type ActivityLevel = 'low' | 'medium' | 'high';
type OutfitPreference = 'light' | 'balanced' | 'warm';
type ViewTab = 'now' | 'planner' | 'insights';
type FeatureKey = 'all' | 'hyperlocal' | 'confidence' | 'decision' | 'comfort' | 'memory' | 'impact' | 'plan' | 'playback' | 'air' | 'clothing';

type FeatureItem = {
  key: FeatureKey;
  label: string;
  tab: ViewTab;
  icon: LucideIcon;
};

type Point = {
  time: string;
  isoTime: string;
  temp: number;
  humidity: number;
  wind: number;
  rain: number;
  confidence: number;
};

type WeatherData = {
  location: string;
  current: { temp: number; apparent: number; humidity: number; wind: number; rain: number; condition: string };
  geo: { lat: number; lon: number; elevation: number; population: number };
  forecast: Point[];
};

type MemoryData = { lastYear: number | null; monthMax: number | null; monthMin: number | null };
type AirData = { aqi: number | null; pm25: number | null; pm10: number | null; ozone: number | null };

const DEG = '\u00B0';
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const fmt = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
const cond = (code: number) => (code <= 1 ? 'Clear' : code <= 3 ? 'Partly Cloudy' : code <= 49 ? 'Foggy' : code <= 67 ? 'Rainy' : code <= 77 ? 'Snowy' : 'Stormy');
const aqiLabel = (aqi: number | null) => (aqi === null ? 'Unavailable' : aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for Sensitive' : aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy');
const riskLabel = (s: number) => (s < 30 ? 'Low Risk' : s < 60 ? 'Moderate Risk' : 'High Risk');
const dtLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const featureItems: FeatureItem[] = [
  { key: 'hyperlocal', label: 'Hyperlocal', tab: 'now', icon: LocateFixed },
  { key: 'confidence', label: 'Confidence', tab: 'now', icon: BarChart3 },
  { key: 'playback', label: 'Playback', tab: 'now', icon: PlayCircle },
  { key: 'decision', label: 'Decisions', tab: 'planner', icon: Lightbulb },
  { key: 'comfort', label: 'Comfort', tab: 'planner', icon: User },
  { key: 'plan', label: 'Plan Lock', tab: 'planner', icon: CalendarClock },
  { key: 'clothing', label: 'Clothing', tab: 'planner', icon: Shirt },
  { key: 'air', label: 'Air Fusion', tab: 'insights', icon: Wind },
  { key: 'memory', label: 'Memory', tab: 'insights', icon: History },
  { key: 'impact', label: 'Alerts', tab: 'insights', icon: AlertTriangle },
];

const Weather = () => {
  const [city, setCity] = useState('Berlin');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [air, setAir] = useState<AirData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [hyperlocal, setHyperlocal] = useState(true);
  const [coldBias, setColdBias] = useState(0);
  const [activity, setActivity] = useState<ActivityLevel>('medium');
  const [outfit, setOutfit] = useState<OutfitPreference>('balanced');

  const [planTime, setPlanTime] = useState(() => dtLocal(new Date(Date.now() + 2 * 3600000)));
  const [planActivity, setPlanActivity] = useState('Commute');
  const [playIdx, setPlayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('now');
  const [activeFeature, setActiveFeature] = useState<FeatureKey>('all');

  const fetchWeather = async (searchCity: string) => {
    setLoading(true);
    setError('');
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=1&language=en&format=json`);
      const geo = await geoRes.json();
      if (!geo.results?.length) throw new Error('City not found');
      const p = geo.results[0];
      const lat = Number(p.latitude);
      const lon = Number(p.longitude);
      const pop = Number(p.population ?? 120000);

      const now = new Date();
      const today = fmt(now);
      const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
      const ly = new Date(now);
      ly.setFullYear(now.getFullYear() - 1);
      const lyDate = fmt(ly);

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&timezone=auto&forecast_days=2`;
      const monthUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${monthStart}&end_date=${today}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const lyUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${lyDate}&end_date=${lyDate}&daily=temperature_2m_max&timezone=auto`;
      const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone`;

      const [wRes, mRes, yRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(monthUrl), fetch(lyUrl), fetch(airUrl)]);
      const w = await wRes.json();
      const m = await mRes.json();
      const y = await yRes.json();
      const a = await aRes.json();

      const cur = w.current;
      const hr = w.hourly;
      const forecast: Point[] = (hr.time as string[])
        .map((iso: string, i: number) => {
          const temp = Number(hr.temperature_2m[i]);
          const humidity = Number(hr.relative_humidity_2m[i]);
          const wind = Number(hr.wind_speed_10m[i]);
          const rain = Number(hr.precipitation_probability[i] ?? 0);
          const confidence = clamp(96 - i * 4 - Math.abs(temp - Number(cur.temperature_2m)) * 1.6 - wind * 0.5 - rain * 0.35, 18, 97);
          return { isoTime: iso, time: new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }), temp, humidity, wind, rain, confidence: Math.round(confidence) };
        })
        .filter((_, i) => i % 3 === 0)
        .slice(0, 12);

      setWeather({
        location: `${p.name}, ${p.country}`,
        current: {
          temp: Number(cur.temperature_2m),
          apparent: Number(cur.apparent_temperature),
          humidity: Number(cur.relative_humidity_2m),
          wind: Number(cur.wind_speed_10m),
          rain: Number(cur.precipitation ?? 0),
          condition: cond(Number(cur.weather_code)),
        },
        geo: { lat, lon, elevation: Number(w.elevation ?? 0), population: pop },
        forecast,
      });

      const mx = m?.daily?.temperature_2m_max as number[] | undefined;
      const mn = m?.daily?.temperature_2m_min as number[] | undefined;
      const lyMax = y?.daily?.temperature_2m_max as number[] | undefined;
      setMemory({ lastYear: lyMax?.length ? lyMax[0] : null, monthMax: mx?.length ? Math.max(...mx) : null, monthMin: mn?.length ? Math.min(...mn) : null });

      const ac = a?.current ?? {};
      setAir({
        aqi: typeof ac.us_aqi === 'number' ? ac.us_aqi : null,
        pm25: typeof ac.pm2_5 === 'number' ? ac.pm2_5 : null,
        pm10: typeof ac.pm10 === 'number' ? ac.pm10 : null,
        ozone: typeof ac.ozone === 'number' ? ac.ozone : null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(city);
  }, []);

  useEffect(() => {
    if (!playing || !weather?.forecast.length) return;
    const id = window.setInterval(() => setPlayIdx((p) => (p + 1) % weather.forecast.length), 1400);
    return () => window.clearInterval(id);
  }, [playing, weather?.forecast.length]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (city.trim()) fetchWeather(city.trim());
  };

  const hyper = useMemo(() => {
    if (!weather) return null;
    const e = clamp(-(weather.geo.elevation / 1000) * 2.2, -4, 1);
    const u = clamp((Math.log10(Math.max(weather.geo.population, 1000)) - 5) * 0.8, 0, 2.8);
    const s = Math.sin((weather.geo.lat + weather.geo.lon) * 4.2) * 0.7;
    const d = e + u + s;
    return { e, u, s, d, adjusted: weather.current.temp + d };
  }, [weather]);

  const feels = useMemo(() => {
    if (!weather) return null;
    const a = activity === 'high' ? 1.6 : activity === 'low' ? -0.8 : 0;
    const o = outfit === 'warm' ? 1 : outfit === 'light' ? -1 : 0;
    const h = hyperlocal && hyper ? hyper.d : 0;
    const humid = weather.current.humidity > 75 ? 0.8 : weather.current.humidity < 35 ? -0.4 : 0;
    return weather.current.apparent + coldBias + a + o + h + humid;
  }, [weather, activity, outfit, hyperlocal, hyper, coldBias]);

  const cards = useMemo(() => {
    if (!weather) return null;
    const walk = weather.forecast.reduce((b, p) => {
      const score = 100 - Math.abs(p.temp - 22) * 2.4 - p.rain * 1.4 - p.wind * 0.9 + p.confidence * 0.3;
      return score > b.score ? { p, score } : b;
    }, { p: weather.forecast[0], score: -999 });

    const laundry = weather.forecast.reduce((b, p) => {
      const score = 100 - p.rain * 2 - p.humidity * 0.6 - p.wind * 0.3;
      return score > b.score ? { p, score } : b;
    }, { p: weather.forecast[0], score: -999 });

    const now = weather.forecast[0];
    const later = weather.forecast[Math.min(2, weather.forecast.length - 1)];
    const nowRisk = now.rain * 1.4 + now.wind * 1.1 + Math.max(0, now.temp - 32) * 1.2;
    const laterRisk = later.rain * 1.4 + later.wind * 1.1 + Math.max(0, later.temp - 32) * 1.2;

    return { walk, laundry, bike: laterRisk + 6 < nowRisk ? `Delay ride to ${later.time}` : `Ride now (${now.time})` };
  }, [weather]);

  const alerts = useMemo(() => {
    if (!weather || !air) return [] as string[];
    const out: string[] = [];
    if (weather.current.wind > 35) out.push('Strong winds: secure balcony items and avoid loose umbrellas.');
    if (weather.current.humidity > 86) out.push('High humidity: slippery surfaces likely during late evening.');
    if (weather.current.rain > 2) out.push('Active precipitation: road spray and lower visibility expected.');
    if (air.aqi !== null && air.aqi > 120) out.push('Air quality stress: limit outdoor workout intensity.');
    if (!out.length) out.push('No significant impact alerts for the next few hours.');
    return out;
  }, [weather, air]);

  const indoorAdvice = useMemo(() => {
    if (!weather || !air) return 'Gathering fusion signals...';
    const aqiScore = air.aqi === null ? 50 : clamp(100 - air.aqi, 0, 100);
    const humidityScore = 100 - Math.abs(weather.current.humidity - 50) * 1.6;
    const windPenalty = weather.current.wind > 28 ? 20 : 0;
    const score = clamp(aqiScore * 0.6 + humidityScore * 0.4 - windPenalty, 0, 100);
    if (score >= 70) return `Open windows now (${Math.round(score)} / 100 comfort score).`;
    if (score >= 40) return `Short ventilation bursts are better (${Math.round(score)} / 100).`;
    return `Keep windows mostly closed for now (${Math.round(score)} / 100).`;
  }, [weather, air]);

  const clothes = useMemo(() => {
    if (!weather || feels === null) return [] as string[];
    const base = feels >= 30 ? 'breathable layer + cap' : feels >= 24 ? 't-shirt + light overshirt' : feels >= 17 ? 'full sleeve + thin jacket' : feels >= 10 ? 'sweater + windproof outer' : 'thermal base + insulated jacket';
    return [
      `Commute: ${base}${weather.current.wind > 25 ? ', wind-resistant shell' : ''}.`,
      `Workout: ${feels > 26 ? 'quick-dry tee + hydration focus' : 'light warm-up layer before start'}.`,
      `Evening: ${feels < 18 ? 'carry an extra mid-layer' : 'single outer layer is enough'}.`,
    ];
  }, [weather, feels]);

  const plan = useMemo(() => {
    if (!weather?.forecast.length || !planTime) return null;
    const t = new Date(planTime).getTime();
    const near = weather.forecast.reduce((b, p) => {
      const d = Math.abs(new Date(p.isoTime).getTime() - t);
      return d < b.d ? { p, d } : b;
    }, { p: weather.forecast[0], d: Number.POSITIVE_INFINITY });

    const score = Math.round(clamp(near.p.rain * 1.4 + near.p.wind * 0.9 + Math.abs(near.p.temp - 23) * 1.2 + (100 - near.p.confidence) * 0.6, 0, 100));
    const k = `plan-lock:${weather.location}:${planActivity}:${planTime}`;
    const prevRaw = window.localStorage.getItem(k);
    const prev = prevRaw ? Number(prevRaw) : null;
    window.localStorage.setItem(k, String(score));
    return { point: near.p, score, delta: prev === null ? null : score - prev };
  }, [weather, planTime, planActivity]);

  const shouldShow = (key: FeatureKey) => activeFeature === 'all' || activeFeature === key;

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    setActiveFeature('all');
  };

  const handleFeaturePick = (key: FeatureKey, tab: ViewTab) => {
    setActiveTab(tab);
    setActiveFeature(key);
  };

  return (
    <div className="glass-card relative z-10 w-full max-w-6xl rounded-[2rem] border border-white/25 p-4 text-slate-100 sm:p-7">
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/20 via-white/5 to-transparent" />

      <form onSubmit={onSearch} className="relative z-10 mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <input type="text" placeholder="Search city..." value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-2xl border border-white/30 bg-white/20 py-3 pl-12 pr-11 text-base text-white placeholder-white/70 outline-none transition focus:border-cyan-200/90 focus:bg-white/25" />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-white/80" />
        </div>
        <button type="button" onClick={() => setHyperlocal((v) => !v)} className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm">Hyperlocal: {hyperlocal ? 'On' : 'Off'}</button>
        <button type="submit" className="rounded-2xl border border-cyan-200/60 bg-cyan-200/20 px-5 py-3 text-sm font-semibold text-cyan-50">Update</button>
      </form>

      {loading ? (
        <div className="flex h-72 items-center justify-center"><div className="h-11 w-11 animate-spin rounded-full border-2 border-white/20 border-t-cyan-200" /></div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200/50 bg-red-400/15 py-10 text-center text-red-100">{error}</div>
      ) : weather ? (
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/20 bg-white/10 p-2">
            <button
              type="button"
              onClick={() => handleTabChange('now')}
              className={`rounded-xl px-4 py-2 text-sm ${activeTab === 'now' ? 'bg-cyan-200/30 text-cyan-50' : 'bg-white/5 text-cyan-100/80'}`}
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('planner')}
              className={`rounded-xl px-4 py-2 text-sm ${activeTab === 'planner' ? 'bg-cyan-200/30 text-cyan-50' : 'bg-white/5 text-cyan-100/80'}`}
            >
              Planner
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('insights')}
              className={`rounded-xl px-4 py-2 text-sm ${activeTab === 'insights' ? 'bg-cyan-200/30 text-cyan-50' : 'bg-white/5 text-cyan-100/80'}`}
            >
              Insights
            </button>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-100/85">
              <LayoutGrid className="h-3.5 w-3.5" />
              Function Launcher
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {featureItems.map((item) => {
                const Icon = item.icon;
                const active = activeFeature === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleFeaturePick(item.key, item.tab)}
                    className={`rounded-xl border p-2 text-center text-xs transition ${
                      active
                        ? 'border-cyan-200/70 bg-cyan-200/20 text-cyan-50'
                        : 'border-white/20 bg-white/5 text-cyan-100/85 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="mx-auto mb-1 h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setActiveFeature('all')}
              className={`mt-2 rounded-lg px-2 py-1 text-xs ${activeFeature === 'all' ? 'bg-cyan-200/20 text-cyan-50' : 'bg-white/5 text-cyan-100/80'}`}
            >
              Show all in current tab
            </button>
          </div>

          {activeTab === 'now' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="rounded-2xl border border-white/20 bg-white/10 p-4 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-cyan-100"><MapPin className="h-4 w-4" /><span className="text-sm tracking-wide">{weather.location}</span></div>
                    <h1 className="text-6xl font-semibold leading-none">{Math.round(hyperlocal && hyper ? hyper.adjusted : weather.current.temp)}{DEG}</h1>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cyan-100/90">{weather.current.condition}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-white/20 bg-white/10 p-2"><Wind className="mx-auto h-4 w-4 text-cyan-100" /><p className="mt-1 font-medium">{Math.round(weather.current.wind)} km/h</p></div>
                    <div className="rounded-xl border border-white/20 bg-white/10 p-2"><Droplets className="mx-auto h-4 w-4 text-cyan-100" /><p className="mt-1 font-medium">{Math.round(weather.current.humidity)}%</p></div>
                    <div className="rounded-xl border border-white/20 bg-white/10 p-2"><ThermometerSun className="mx-auto h-4 w-4 text-cyan-100" /><p className="mt-1 font-medium">{Math.round(weather.current.apparent)}{DEG}</p></div>
                  </div>
                </div>
                <div className="h-44 rounded-2xl border border-white/15 bg-white/10 p-3">
                  <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-100/80">Micro-Forecast Curve</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weather.forecast}>
                      <defs><linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#67e8f9" stopOpacity={0.45} /><stop offset="95%" stopColor="#67e8f9" stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="time" hide />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.82)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.25)', color: '#e0f2fe' }} itemStyle={{ color: '#cffafe' }} labelStyle={{ color: '#a5f3fc' }} />
                      <Area type="monotone" dataKey="temp" stroke="#67e8f9" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {shouldShow('hyperlocal') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Hyperlocal Street Mode</h3>
                  {hyper ? (
                    <div className="space-y-2">
                      <p>Elevation correction: {hyper.e.toFixed(1)}{DEG}</p>
                      <p>Urban heat correction: +{hyper.u.toFixed(1)}{DEG}</p>
                      <p>Street-level variance: {hyper.s >= 0 ? '+' : ''}{hyper.s.toFixed(1)}{DEG}</p>
                      <p className="text-cyan-100">Net local delta: {hyper.d >= 0 ? '+' : ''}{hyper.d.toFixed(1)}{DEG}</p>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {shouldShow('confidence') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4 lg:col-span-2">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Confidence Meter</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {weather.forecast.slice(0, 6).map((p) => (
                      <div key={p.isoTime} className="rounded-xl border border-white/20 bg-white/10 p-2 text-xs">
                        <p className="mb-1">{p.time}</p>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-900/40"><div className="h-full bg-cyan-300" style={{ width: `${p.confidence}%` }} /></div>
                        <p className="mt-1">{p.confidence}% confidence</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {shouldShow('playback') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Micro Playback</h3>
                  <button type="button" onClick={() => setPlaying((v) => !v)} className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs">
                    {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}{playing ? 'Pause' : 'Play'} 12-hour story
                  </button>
                  {weather.forecast[playIdx] ? <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm"><p>{weather.forecast[playIdx].time}</p><p>{Math.round(weather.forecast[playIdx].temp)}{DEG}, rain {Math.round(weather.forecast[playIdx].rain)}%</p><p>Wind {Math.round(weather.forecast[playIdx].wind)} km/h</p></div> : null}
                </section>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'planner' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {shouldShow('decision') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4 lg:col-span-2">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Decision Cards</h3>
                  {cards ? (
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-xl border border-white/20 bg-white/10 p-3"><p className="text-cyan-100">Best walk window</p><p>{cards.walk.p.time} at {Math.round(cards.walk.p.temp)}{DEG}</p></div>
                      <div className="rounded-xl border border-white/20 bg-white/10 p-3"><p className="text-cyan-100">Laundry-safe window</p><p>{cards.laundry.p.time}, rain {Math.round(cards.laundry.p.rain)}%</p></div>
                      <div className="rounded-xl border border-white/20 bg-white/10 p-3"><p className="text-cyan-100">Bike decision</p><p>{cards.bike}</p></div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {shouldShow('comfort') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Comfort Profile</h3>
                  <label className="mb-2 block text-xs text-cyan-100/85">Cold/Hot Bias: {coldBias > 0 ? `+${coldBias}` : coldBias}{DEG}</label>
                  <input type="range" min={-5} max={5} value={coldBias} onChange={(e) => setColdBias(Number(e.target.value))} className="mb-3 w-full accent-cyan-300" />
                  <select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)} className="mb-2 w-full rounded-xl border border-white/30 bg-slate-900/35 p-2 text-sm">
                    <option value="low">Activity: Low</option><option value="medium">Activity: Medium</option><option value="high">Activity: High</option>
                  </select>
                  <select value={outfit} onChange={(e) => setOutfit(e.target.value as OutfitPreference)} className="w-full rounded-xl border border-white/30 bg-slate-900/35 p-2 text-sm">
                    <option value="light">Outfit: Light</option><option value="balanced">Outfit: Balanced</option><option value="warm">Outfit: Warm</option>
                  </select>
                  <p className="mt-3 text-sm text-cyan-50">Personalized feels-like: {feels !== null ? `${Math.round(feels)}${DEG}` : '--'}</p>
                </section>
              ) : null}

              {shouldShow('plan') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4 lg:col-span-2">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Plan Lock</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input type="datetime-local" value={planTime} onChange={(e) => setPlanTime(e.target.value)} className="rounded-xl border border-white/30 bg-slate-900/35 p-2 text-sm" />
                    <input type="text" value={planActivity} onChange={(e) => setPlanActivity(e.target.value)} className="rounded-xl border border-white/30 bg-slate-900/35 p-2 text-sm" />
                    <button type="button" className="rounded-xl border border-white/30 bg-cyan-200/15 p-2 text-sm" onClick={() => fetchWeather(city)}>Refresh plan risk</button>
                  </div>
                  {plan ? (
                    <div className="mt-3 rounded-xl border border-white/20 bg-white/10 p-3 text-sm">
                      <p>Locked slot: {plan.point.time}</p><p>Risk: {plan.score}/100 ({riskLabel(plan.score)})</p>
                      <p>Change since last check: {plan.delta === null ? 'No baseline yet' : `${plan.delta > 0 ? '+' : ''}${plan.delta} points`}</p>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {shouldShow('clothing') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4 lg:col-span-3">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Localized Clothing Assistant</h3>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">{clothes.map((c) => <p key={c} className="rounded-xl border border-white/20 bg-white/10 p-3">{c}</p>)}</div>
                </section>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'insights' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {shouldShow('air') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Indoor + Outdoor Fusion</h3>
                  <div className="space-y-1 text-sm">
                    <p>AQI: {air?.aqi ?? '--'} ({aqiLabel(air?.aqi ?? null)})</p>
                    <p>PM2.5: {air?.pm25?.toFixed(1) ?? '--'} µg/m³</p>
                    <p>PM10: {air?.pm10?.toFixed(1) ?? '--'} µg/m³</p>
                    <p>Ozone: {air?.ozone?.toFixed(1) ?? '--'} µg/m³</p>
                  </div>
                  <p className="mt-2 rounded-xl border border-white/20 bg-white/10 p-2 text-sm">{indoorAdvice}</p>
                </section>
              ) : null}

              {shouldShow('memory') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Weather Memory Timeline</h3>
                  <div className="space-y-1 text-sm">
                    <p>Same date last year max: {memory?.lastYear !== null && memory?.lastYear !== undefined ? `${Math.round(memory.lastYear)}${DEG}` : '--'}</p>
                    <p>This month hottest day: {memory?.monthMax !== null && memory?.monthMax !== undefined ? `${Math.round(memory.monthMax)}${DEG}` : '--'}</p>
                    <p>This month coldest day: {memory?.monthMin !== null && memory?.monthMin !== undefined ? `${Math.round(memory.monthMin)}${DEG}` : '--'}</p>
                  </div>
                </section>
              ) : null}

              {shouldShow('impact') ? (
                <section className="rounded-2xl border border-white/20 bg-white/10 p-4 lg:col-span-3">
                  <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/90">Impact Alerts</h3>
                  <div className="space-y-2 text-sm">{alerts.map((a) => <p key={a} className="rounded-xl border border-white/20 bg-white/10 p-2">{a}</p>)}</div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default Weather;

