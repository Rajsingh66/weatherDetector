import React, { useState, useEffect } from 'react';
import { Search, MapPin, Wind, Droplets, ThermometerSun } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface WeatherData {
    current: {
        temp: number;
        humidity: number;
        windSpeed: number;
        condition: string;
    };
    forecast: Array<{
        time: string;
        temp: number;
    }>;
    location: string;
}

const Weather = () => {
    const [city, setCity] = useState('Berlin'); // Default
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Mock function to simulate fetching data (OpenMeteo is real but requires async complex parsing, I'll use real OpenMeteo for "Location" search but mock the weather logic slightly for robustness if geocoding fails, or fully implement openmeteo if I can be concise. Let's do a reliable fetch.)

    const fetchWeather = async (searchCity: string) => {
        setLoading(true);
        setError('');
        try {
            // 1. Geocode
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${searchCity}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                throw new Error('City not found');
            }

            const { latitude, longitude, name, country } = geoData.results[0];

            // 2. Weather
            const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&timezone=auto&forecast_days=1`
            );
            const weatherData = await weatherRes.json();

            const current = weatherData.current;
            const hourly = weatherData.hourly;

            // Format hourly data for chart (take every 3rd hour for brevity)
            const forecast = hourly.time.map((t: string, i: number) => ({
                time: new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
                temp: hourly.temperature_2m[i]
            })).filter((_: any, i: number) => i % 3 === 0).slice(0, 8); // 24h worth roughly

            setWeather({
                current: {
                    temp: current.temperature_2m,
                    humidity: current.relative_humidity_2m,
                    windSpeed: current.wind_speed_10m,
                    condition: getWeatherCondition(current.weather_code)
                },
                forecast,
                location: `${name}, ${country}`
            });

        } catch (err: any) {
            setError(err.message || 'Failed to fetch weather data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather(city);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (city.trim()) fetchWeather(city);
    };

    const getWeatherCondition = (code: number) => {
        if (code <= 3) return 'Clear/Cloudy';
        if (code <= 67) return 'Rainy';
        if (code <= 77) return 'Snowy';
        return 'Stormy';
    };

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative mb-8">
                <input
                    type="text"
                    placeholder="Search city..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-100 border-none outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-medium text-slate-600 placeholder-slate-400"
                />
                <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            </form>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : error ? (
                <div className="text-center text-red-500 py-10 font-medium">{error}</div>
            ) : weather ? (
                <>
                    {/* Header */}
                    <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center justify-center gap-2 text-slate-500 mb-2">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium tracking-wide">{weather.location}</span>
                        </div>
                        <h1 className="text-6xl font-bold text-slate-800 mb-2">{Math.round(weather.current.temp)}°</h1>
                        <p className="text-indigo-500 font-medium">{weather.current.condition}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-indigo-50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 duration-300">
                            <Wind className="w-6 h-6 text-indigo-500" />
                            <span className="text-sm font-semibold text-slate-700">{weather.current.windSpeed} km/h</span>
                            <span className="text-xs text-slate-500">Wind</span>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 duration-300 delay-75">
                            <Droplets className="w-6 h-6 text-blue-500" />
                            <span className="text-sm font-semibold text-slate-700">{weather.current.humidity}%</span>
                            <span className="text-xs text-slate-500">Humidity</span>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 duration-300 delay-150">
                            <ThermometerSun className="w-6 h-6 text-orange-500" />
                            <span className="text-sm font-semibold text-slate-700">Feel</span>
                            {/* Just mocking feels like = temp for simplicity or using apparent temp if available */}
                            <span className="text-xs text-slate-500">Real Feel</span>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-40 w-full mt-4">
                        <h3 className="text-sm font-semibold text-slate-400 mb-4 pl-1">Today's Temperature</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weather.forecast}>
                                <defs>
                                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#4f46e5' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="temp"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorTemp)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            ) : null}
        </div>
    );
};

export default Weather;
