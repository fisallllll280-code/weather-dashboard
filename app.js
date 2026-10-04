const weatherCodeMap = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Light freezing drizzle", icon: "🌧️" },
  57: { label: "Dense freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌦️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Light freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Heavy showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "🌨️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Severe thunderstorm", icon: "⛈️" }
};

const cityInput = document.getElementById("city-input");
const searchForm = document.getElementById("search-form");
const cityName = document.getElementById("city-name");
const weatherIcon = document.getElementById("weather-icon");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const updatedTime = document.getElementById("updated-time");
const feelsLike = document.getElementById("feels-like");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const timezone = document.getElementById("timezone");
const hourlyForecast = document.getElementById("hourly-forecast");
const dailyForecast = document.getElementById("daily-forecast");

const defaultCity = "London";

function formatTemp(value) {
  return `${Math.round(value)}°C`;
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { weekday: "short" });
}

function getWeatherStatus(code) {
  return weatherCodeMap[code] || { label: "Unknown", icon: "❔" };
}

async function fetchWeather(city) {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );

    if (!geoRes.ok) {
      throw new Error("City lookup failed");
    }

    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("City not found");
    }

    const place = geoData.results[0];
    const lat = place.latitude;
    const lon = place.longitude;

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
    );

    if (!weatherRes.ok) {
      throw new Error("Weather data fetch failed");
    }

    const data = await weatherRes.json();
    renderWeather(place.name, data);
  } catch (error) {
    alert(error.message || "Unable to fetch weather data");
  }
}

function renderWeather(city, data) {
  const current = data.current;
  const currentStatus = getWeatherStatus(current.weather_code);

  cityName.textContent = city;
  temperature.textContent = formatTemp(current.temperature_2m);
  condition.textContent = currentStatus.label;
  weatherIcon.textContent = currentStatus.icon;
  feelsLike.textContent = formatTemp(current.apparent_temperature);
  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  timezone.textContent = data.timezone || "UTC";

  const now = new Date();
  updatedTime.textContent = `Updated ${now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;

  renderHourly(data.hourly);
  renderDaily(data.daily);
}

function renderHourly(hourly) {
  hourlyForecast.innerHTML = "";

  const nextHours = hourly.time.slice(0, 8);

  nextHours.forEach((time, index) => {
    const temperatureValue = hourly.temperature_2m[index];
    const code = hourly.weather_code[index];
    const status = getWeatherStatus(code);

    const item = document.createElement("div");
    item.className = "hourly-item";
    item.innerHTML = `
      <div class="time">${formatTime(time)}</div>
      <div class="icon">${status.icon}</div>
      <div class="temp">${formatTemp(temperatureValue)}</div>
    `;

    hourlyForecast.appendChild(item);
  });
}

function renderDaily(daily) {
  dailyForecast.innerHTML = "";

  const days = daily.time.slice(0, 5);

  days.forEach((day, index) => {
    const code = daily.weather_code[index];
    const status = getWeatherStatus(code);
    const max = daily.temperature_2m_max[index];
    const min = daily.temperature_2m_min[index];

    const item = document.createElement("div");
    item.className = "daily-item";
    item.innerHTML = `
      <div class="day">${formatDay(day)}</div>
      <div class="icon">${status.icon}</div>
      <div class="temps">${formatTemp(max)} / ${formatTemp(min)}</div>
    `;

    dailyForecast.appendChild(item);
  });
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = cityInput.value.trim() || defaultCity;
  fetchWeather(city);
});

fetchWeather(defaultCity);
