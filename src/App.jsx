import { useEffect, useMemo, useState } from 'react';

const weatherCodeMap = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Moderate drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  56: { label: 'Light freezing drizzle', icon: '🌧️' },
  57: { label: 'Dense freezing drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌦️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Light freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Slight snow', icon: '🌨️' },
  73: { label: 'Moderate snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Heavy showers', icon: '🌧️' },
  82: { label: 'Violent showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Severe thunderstorm', icon: '⛈️' },
};

const defaultCity = 'London';
const favoritesKey = 'weather-dashboard-favorites';
const themeKey = 'weather-dashboard-theme';

function formatTemp(value) {
  return `${Math.round(value)}°C`;
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { weekday: 'short' });
}

function getWeatherStatus(code) {
  return weatherCodeMap[code] || { label: 'Unknown', icon: '❔' };
}

async function fetchWeatherByCity(city) {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );

  if (!geoRes.ok) throw new Error('City lookup failed');

  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) throw new Error('City not found');

  const place = geoData.results[0];
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
  );

  if (!weatherRes.ok) throw new Error('Weather data fetch failed');

  const data = await weatherRes.json();
  return { city: place.name, data };
}

async function fetchWeatherByCoords(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
  );

  if (!res.ok) throw new Error('Failed to fetch weather for current location');

  return res.json();
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [cityInput, setCityInput] = useState(defaultCity);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    } catch {
      return [];
    }
  });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(themeKey) || 'dark';
    setTheme(savedTheme);
    document.body.dataset.theme = savedTheme;
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem(themeKey, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  }, [favorites]);

  const currentWeather = useMemo(() => {
    if (!weather) return null;

    const current = weather.current;
    const status = getWeatherStatus(current.weather_code);

    return {
      city: weather.city,
      temperature: current.temperature_2m,
      condition: status.label,
      icon: status.icon,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind: current.wind_speed_10m,
      timezone: weather.timezone,
      updatedAt: new Date(),
    };
  }, [weather]);

  const hourlyForecast = useMemo(() => {
    if (!weather) return [];
    return weather.hourly.time.slice(0, 8).map((time, index) => ({
      time,
      temp: weather.hourly.temperature_2m[index],
      code: weather.hourly.weather_code[index],
    }));
  }, [weather]);

  const dailyForecast = useMemo(() => {
    if (!weather) return [];
    return weather.daily.time.slice(0, 5).map((day, index) => ({
      day,
      code: weather.daily.weather_code[index],
      max: weather.daily.temperature_2m_max[index],
      min: weather.daily.temperature_2m_min[index],
    }));
  }, [weather]);

  const loadWeather = async (city) => {
    setLoading(true);
    setError('');

    try {
      const result = await fetchWeatherByCity(city);
      setWeather({ ...result.data, city: result.city });
      setCityInput(result.city);
      setFavorites((prev) => {
        const unique = new Set(prev);
        unique.add(result.city);
        return [...unique];
      });
    } catch (err) {
      setError(err.message || 'Unable to load weather');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather(defaultCity);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = cityInput.trim();
    if (trimmed) {
      loadWeather(trimmed);
    }
  };

  const handleFavoriteClick = (city) => {
    setCityInput(city);
    loadWeather(city);
  };

  const handleGeoLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await fetchWeatherByCoords(latitude, longitude);

          const reverseRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
          );

          const reverseData = await reverseRes.json();
          const city = reverseData.results?.[0]?.name || 'My Location';

          setWeather({ ...data, city });
          setCityInput(city);
          setFavorites((prev) => [...new Set([...prev, city])]);
        } catch (err) {
          setError(err.message || 'Could not load your location weather');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setError('Permission denied. Please allow location access.');
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Weather Dashboard</p>
          <h1>Forecast Overview</h1>
        </div>

        <div className="toolbar">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          <button
            type="button"
            className="toolbar-btn"
            onClick={handleGeoLocation}
            disabled={isLocating}
          >
            {isLocating ? 'Locating...' : '📍 My Location'}
          </button>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Search city..."
            aria-label="City input"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </button>
        </form>
      </header>

      <div className="favorites">
        {favorites.map((city) => (
          <button
            key={city}
            type="button"
            className="favorite-btn"
            onClick={() => handleFavoriteClick(city)}
          >
            {city}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!loading && currentWeather ? (
        <main className="dashboard">
          <section className="card current-card">
            <div className="city-row">
              <div>
                <p className="label">Current Weather</p>
                <h2>{currentWeather.city}</h2>
              </div>
              <div className="weather-icon" aria-label="Current weather icon">
                {currentWeather.icon}
              </div>
            </div>

            <div className="temp-row">
              <div className="temperature">{formatTemp(currentWeather.temperature)}</div>
              <div className="condition-block">
                <p className="condition">{currentWeather.condition}</p>
                <p className="subtext">
                  Updated {currentWeather.updatedAt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat">
                <span>Feels like</span>
                <strong>{formatTemp(currentWeather.feelsLike)}</strong>
              </div>
              <div className="stat">
                <span>Humidity</span>
                <strong>{currentWeather.humidity}%</strong>
              </div>
              <div className="stat">
                <span>Wind</span>
                <strong>{Math.round(currentWeather.wind)} km/h</strong>
              </div>
              <div className="stat">
                <span>Timezone</span>
                <strong>{currentWeather.timezone}</strong>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="section-header">
              <h3>Hourly Forecast</h3>
            </div>
            <div className="hourly-grid">
              {hourlyForecast.map((item) => (
                <div key={item.time} className="hourly-item">
                  <div className="time">{formatTime(item.time)}</div>
                  <div className="icon">{getWeatherStatus(item.code).icon}</div>
                  <div className="temp">{formatTemp(item.temp)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="section-header">
              <h3>5-Day Forecast</h3>
            </div>
            <div className="daily-grid">
              {dailyForecast.map((item) => (
                <div key={item.day} className="daily-item">
                  <div className="day">{formatDay(item.day)}</div>
                  <div className="icon">{getWeatherStatus(item.code).icon}</div>
                  <div className="temps">
                    {formatTemp(item.max)} / {formatTemp(item.min)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <div className="loading-box">Loading weather data...</div>
      )}
    </div>
  );
}
