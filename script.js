document.addEventListener('DOMContentLoaded', () => {
    // Prevent scrolling during welcome animation
    document.body.style.overflow = 'hidden';
    
    // Remove welcome animation and enable scrolling after animation
    setTimeout(() => {
        document.body.style.overflow = '';
        const welcomeAnimation = document.querySelector('.welcome-animation');
        welcomeAnimation.addEventListener('animationend', () => {
            welcomeAnimation.remove();
        });
    }, 3000);

    const apiKey = '3ee10af5e91fa47a34fa3a6c6d23e4ac';
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-btn');
    const aboutBtn = document.querySelector('.about-btn');
    const modal = document.getElementById('aboutModal');
    const closeModal = document.querySelector('.close-modal');
    let currentCity = 'London';

    // Slider Setup
    const sliderWrapper = document.querySelector('.forecast-wrapper');
    const prevBtn = document.querySelector('.slider-btn.prev');
    const nextBtn = document.querySelector('.slider-btn.next');
    let currentIndex = 0;
    const cardWidth = 165; // card width + gap
    let touchStartX = 0;
    let touchEndX = 0;

    // Touch Events for Slider
    document.querySelector('.forecast-container').addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.querySelector('.forecast-container').addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentIndex < getMaxIndex()) {
                currentIndex++;
                updateSliderPosition();
            } else if (diff < 0 && currentIndex > 0) {
                currentIndex--;
                updateSliderPosition();
            }
        }
    }

    function getMaxIndex() {
        return Math.max(0, sliderWrapper.children.length - Math.floor(sliderWrapper.parentElement.offsetWidth / cardWidth));
    }

    function updateSliderPosition() {
        sliderWrapper.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
        
        prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
        prevBtn.style.cursor = currentIndex === 0 ? 'default' : 'pointer';
        
        const maxIndex = getMaxIndex();
        nextBtn.style.opacity = currentIndex >= maxIndex ? '0.5' : '1';
        nextBtn.style.cursor = currentIndex >= maxIndex ? 'default' : 'pointer';
    }

    // Weather Data Fetching
    async function fetchWeatherData(city) {
        try {
            const searchBar = document.querySelector('.search-bar');
            searchBar.classList.add('loading');

            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
            );
            
            if (!response.ok) throw new Error('City not found');

            const data = await response.json();
            updateWeatherDisplay(data);
            updateWeatherStats(data);
            fetchForecast(city);
            currentCity = city;

            searchBar.classList.remove('loading');
        } catch (error) {
            showError('City not found. Please try again.');
            document.querySelector('.search-bar').classList.remove('loading');
        }
    }

    async function fetchForecast(city) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`
            );
            
            if (!response.ok) throw new Error('Forecast unavailable');

            const data = await response.json();
            updateForecastChart(data);
            updateWeeklyForecast(data);
        } catch (error) {
            console.error('Error fetching forecast:', error);
        }
    }

    function updateWeatherDisplay(data) {
        document.querySelector('#city-name').textContent = data.name;
        document.querySelector('.current-weather h1').textContent = 
            `${Math.round(data.main.temp)}°C`;
        document.querySelector('.current-weather p').textContent = 
            capitalizeFirstLetter(data.weather[0].description);

        const weatherIcon = document.querySelector('.weather-icon');
        weatherIcon.innerHTML = `<img src="http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="Weather">`;

        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        document.querySelector('.sunrise span').textContent = formatTime(sunrise);
        document.querySelector('.sunset span').textContent = formatTime(sunset);
    }

    function updateWeatherStats(data) {
        const windSpeed = Math.round(data.wind.speed * 3.6);
        const stats = [
            { value: `${windSpeed} km/h`, change: `${Math.round(windSpeed * 0.1)} km/h higher` },
            { value: `${data.clouds.all}%`, change: '5% higher' },
            { value: `${Math.round(data.main.temp)}°C`, change: '2°C higher' },
            { value: `${data.main.humidity}%`, change: '3% higher' }
        ];

        document.querySelectorAll('.stat-item').forEach((item, index) => {
            item.querySelector('h4').textContent = stats[index].value;
            item.querySelector('span').textContent = stats[index].change;
        });
    }

    function updateWeeklyForecast(data) {
        const forecastWrapper = document.querySelector('.forecast-wrapper');
        forecastWrapper.innerHTML = '';
        currentIndex = 0;

        const dailyForecasts = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            if (!dailyForecasts[day]) {
                dailyForecasts[day] = {
                    icon: item.weather[0].icon,
                    temp: Math.round(item.main.temp),
                    description: item.weather[0].description
                };
            }
        });

        Object.entries(dailyForecasts).forEach(([day, forecast]) => {
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="day">${day}</div>
                <img src="http://openweathermap.org/img/wn/${forecast.icon}.png" 
                     alt="Weather" class="weather-icon">
                <div class="temp">${forecast.temp}°C</div>
                <div class="description">${capitalizeFirstLetter(forecast.description)}</div>
            `;
            forecastWrapper.appendChild(card);
        });

        updateSliderPosition();
    }

    function updateForecastChart(data) {
        const ctx = document.getElementById('tempChart').getContext('2d');
        const temperatures = data.list.slice(0, 8).map(item => Math.round(item.main.temp));
        const labels = data.list.slice(0, 8).map(item => formatTime(new Date(item.dt * 1000)));

        if (window.forecastChart) {
            window.forecastChart.destroy();
        }

        window.forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperature °C',
                    data: temperatures,
                    borderColor: '#3498db',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: '#eee' },
                        ticks: {
                            callback: value => value + '°C',
                            font: { size: 10 }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Utility Functions
    function formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    // Event Listeners
    nextBtn.addEventListener('click', () => {
        if (currentIndex < getMaxIndex()) {
            currentIndex++;
            updateSliderPosition();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateSliderPosition();
        }
    });

    searchBtn.addEventListener('click', () => {
        const city = searchInput.value.trim();
        if (city) fetchWeatherData(city);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            fetchWeatherData(searchInput.value.trim());
        }
    });

    aboutBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle window resize
    const debouncedResize = debounce(() => {
        currentIndex = 0;
        updateSliderPosition();
        if (window.forecastChart) {
            window.forecastChart.resize();
        }
    }, 250);

    window.addEventListener('resize', debouncedResize);

    // Handle orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            currentIndex = 0;
            updateSliderPosition();
            if (window.forecastChart) {
                window.forecastChart.resize();
            }
        }, 100);
    });

    // Network status handling
    window.addEventListener('online', () => {
        fetchWeatherData(currentCity);
    });

    window.addEventListener('offline', () => {
        showError('No internet connection. Please check your network.');
    });

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize
    function updateCurrentTime() {
        document.querySelector('#current-time').textContent = formatTime(new Date());
    }

    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
    fetchWeatherData(currentCity);

    // Auto-refresh weather data
    setInterval(() => {
        if (navigator.onLine) {
            fetchWeatherData(currentCity);
        }
    }, 300000); // Every 5 minutes
});
