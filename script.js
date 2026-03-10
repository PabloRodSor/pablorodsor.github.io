// --- CONFIGURATION ---
const API_KEY = 'TU_API_KEY';
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// State
let currentUnit = localStorage.getItem('weatherApp_unit') || 'metric'; // 'metric' (C) or 'imperial' (F)
let savedCities = JSON.parse(localStorage.getItem('weatherApp_saved')) || [];
let currentCityData = null; // Store last fetched data

// DOM Elements
const weatherContainer = document.getElementById('weather-container');
const errorMessage = document.getElementById('error-message');
const loader = document.getElementById('loader');

// Menu Elements
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const chips = document.querySelectorAll('.chip');
const navLinks = document.querySelectorAll('.sidebar-links a');
const appSections = document.querySelectorAll('.app-section');

// Display Elements
const cityNameEl = document.getElementById('city-name');
const dateEl = document.getElementById('date');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('description');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const feelsLikeEl = document.getElementById('feels-like');
const weatherIconEl = document.getElementById('weather-icon-i');
const bgGradient = document.querySelector('.background-gradient');

// Functional Elements
const saveBtn = document.getElementById('save-btn');
const savedListEl = document.getElementById('saved-list');
const unitToggleBtn = document.getElementById('unit-toggle');
const unitLabel = document.getElementById('unit-label');
const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');

// --- INITIALIZATION ---
init();

function init() {
    updateUnitLabel();
    renderSavedCities();
    // OPTIONAL: Load last searched city or default
    // fetchWeather('Madrid'); 
}

// --- EVENT LISTENERS ---

// Search
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        fetchWeather(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
        }
    }
});

// Sidebar Toggle
function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('hidden');
}

menuBtn.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

// Navigation Logic
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // If it's an external link, let the browser handle it
        if (link.classList.contains('nav-link-external')) {
            return;
        }

        e.preventDefault();

        // Remove active class from all links
        navLinks.forEach(l => l.classList.remove('active'));
        // Add to clicked
        link.classList.add('active');

        // Hide all sections
        appSections.forEach(section => section.classList.add('hidden'));

        // Show target section
        const targetId = link.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            // Specific logic when entering Saved View
            if (targetId === 'saved-section') {
                renderSavedCities();
            }
        }

        // Close sidebar on mobile/desktop
        toggleSidebar();
    });
});

// Quick Access Chips
chips.forEach(chip => {
    chip.addEventListener('click', () => {
        const city = chip.getAttribute('data-city');
        cityInput.value = city;
        // Switch to home view if not there
        navigateToHome();
        fetchWeather(city);
    });
});

// Save/Favorite Button
saveBtn.addEventListener('click', () => {
    if (!currentCityData) return;

    const city = currentCityData.name;
    const index = savedCities.indexOf(city);

    if (index === -1) {
        // Add
        savedCities.push(city);
        saveBtn.classList.add('saved');
        saveBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    } else {
        // Remove
        savedCities.splice(index, 1);
        saveBtn.classList.remove('saved');
        saveBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }

    localStorage.setItem('weatherApp_saved', JSON.stringify(savedCities));
});

// Unit Toggle
unitToggleBtn.addEventListener('click', () => {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('weatherApp_unit', currentUnit);
    updateUnitLabel();

    // Refresh data if available
    if (currentCityData && currentCityData.name) {
        fetchWeather(currentCityData.name);
    }
});

// --- FUNCTIONS ---

function navigateToHome() {
    // Reset nav
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector('[data-target="home-section"]').classList.add('active');

    appSections.forEach(s => s.classList.add('hidden'));
    document.getElementById('home-section').classList.remove('hidden');
}

function updateUnitLabel() {
    unitLabel.textContent = currentUnit === 'metric' ? 'Celsius (°C)' : 'Fahrenheit (°F)';
}

function renderSavedCities() {
    savedListEl.innerHTML = '';

    if (savedCities.length === 0) {
        savedListEl.innerHTML = '<p class="empty-msg">No tienes ciudades guardadas aún.</p>';
        return;
    }

    savedCities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'saved-item';
        item.innerHTML = `
            <span>${city}</span>
            <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
        `;

        // Load on click
        item.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return; // Ignore if delete clicked
            navigateToHome();
            fetchWeather(city);
        });

        // Delete
        const delBtn = item.querySelector('.delete-btn');
        delBtn.addEventListener('click', () => {
            savedCities = savedCities.filter(c => c !== city);
            localStorage.setItem('weatherApp_saved', JSON.stringify(savedCities));
            renderSavedCities();
            // Also update heart if viewing that city
            if (currentCityData && currentCityData.name === city) {
                saveBtn.classList.remove('saved');
                saveBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
            }
        });

        savedListEl.appendChild(item);
    });
}



// --- FUNCTIONS ---

// Mock Data for fallback styling/testing
const MOCK_DATA = {
    name: "Ciudad Demo",
    sys: { country: "DM" },
    main: {
        temp: 22.5,
        humidity: 60,
        feels_like: 24.0
    },
    wind: { speed: 5.5 },
    weather: [
        { main: "Clear", description: "cielo despejado", icon: "01d" }
    ]
};

async function fetchWeather(city) {
    // Show loader, hide content, clear error
    loader.classList.remove('hidden');
    weatherContainer.classList.add('hidden');
    errorMessage.style.display = 'none';

    try {
        // Attempt to fetch from API
        // Note: usage of 'units=metric' for Celsius
        const response = await fetch(`${API_BASE_URL}?q=${city}&appid=${API_KEY}&units=metric&lang=es`);

        if (!response.ok) {
            throw new Error(`Ciudad no encontrada (${response.status})`);
        }

        const data = await response.json();
        updateUI(data);

    } catch (error) {
        console.warn("Error fetching data (likely invalid API key or city not found). Using Mock Data for demo.", error);

        // If it's a 404/401, we might want to show error to user OR show mock data if strictly requested to "simulate"
        // The prompt says "usa datos simulados... si la llamada falla para que pueda ver el diseño"
        // So we will fallback to mock data but maybe change the name to what displayed

        if (API_KEY === 'TU_API_KEY') {
            // Explicitly handle the "no key" scenario
            const mockClone = { ...MOCK_DATA };
            mockClone.name = city.charAt(0).toUpperCase() + city.slice(1) + " (Demo)";

            // Simulate network delay for effect
            setTimeout(() => {
                updateUI(mockClone);
            }, 800);
        } else {
            // Real error (e.g. city not found)
            showError("No se pudo encontrar la ciudad. Intenta otra vez.");
            loader.classList.add('hidden');
        }
    }
}

function updateUI(data) {
    // Hide loader
    loader.classList.add('hidden');

    // Format Date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('es-ES', options);

    // Update Text Content
    cityNameEl.textContent = `${data.name}, ${data.sys.country || ''}`;
    tempEl.textContent = `${Math.round(data.main.temp)}°C`;
    descEl.textContent = data.weather[0].description;
    humidityEl.textContent = `${data.main.humidity}%`;
    windEl.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`; // Convert m/s to km/h if preferred, or keep m/s
    feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°C`;

    // Update Icon
    const weatherMain = data.weather[0].main.toLowerCase();
    updateWeatherIcon(weatherMain);

    // Update Background Theme based on Temp
    updateBackground(data.main.temp);

    // Show Container
    weatherContainer.classList.remove('hidden');
}

function updateWeatherIcon(weatherCondition) {
    // Map OpenWeatherMap conditions to FontAwesome icons
    weatherIconEl.className = 'fa-solid'; // reset

    if (weatherCondition.includes('cloud')) {
        weatherIconEl.classList.add('fa-cloud');
        weatherIconEl.style.color = '#dfe4ea';
    } else if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
        weatherIconEl.classList.add('fa-cloud-rain');
        weatherIconEl.style.color = '#a4b0be';
    } else if (weatherCondition.includes('thunderstorm')) {
        weatherIconEl.classList.add('fa-bolt');
        weatherIconEl.style.color = '#f1c40f';
    } else if (weatherCondition.includes('snow')) {
        weatherIconEl.classList.add('fa-snowflake');
        weatherIconEl.style.color = '#fff';
    } else if (weatherCondition.includes('clear')) {
        weatherIconEl.classList.add('fa-sun');
        weatherIconEl.style.color = '#f1c40f';
    } else {
        weatherIconEl.classList.add('fa-cloud-sun'); // Fallback
        weatherIconEl.style.color = '#fff';
    }
}

function updateBackground(temp) {
    // FORMAL THEME UPDATE:
    // We keep the dark professional background (handled in CSS).
    // The animated sphere provides the dynamic feel.
    // If you want to change accent colors slightly, we could do that, but changing the whole background
    // might break the "formal" look. Let's make subtle adjustments to the earth glow instead?

    // For now, let's just log it or do a very subtle tint on the gradient if requested,
    // but the user asked for a "formal weather page", so keeping it dark blue/black is best.
    const bg = document.querySelector('.background-gradient');

    // Subtle shift in the deep gradient
    if (temp >= 25) {
        // Warmer dark
        bg.style.background = 'linear-gradient(to bottom, #2c3e50, #4ca1af)';
    } else if (temp <= 10) {
        // Colder dark
        bg.style.background = 'linear-gradient(to bottom, #000428, #004e92)';
    } else {
        // Neutral dark
        bg.style.background = 'linear-gradient(to bottom, #0f2027, #203a43, #2c5364)';
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
}

// --- CHATBOT NATIVO LOGIC ---
const cbToggle = document.getElementById('chatbot-toggle');
const cbWindow = document.getElementById('chatbot-window');
const cbClose = document.getElementById('chatbot-close');
const cbSend = document.getElementById('chatbot-send');
const cbInput = document.getElementById('chatbot-input');
const cbMessages = document.getElementById('chatbot-messages');

if (cbToggle && cbWindow) {
    cbToggle.addEventListener('click', () => {
        cbWindow.classList.toggle('hidden');
    });

    cbClose.addEventListener('click', () => {
        cbWindow.classList.add('hidden');
    });

    cbSend.addEventListener('click', handleChatbotSubmit);
    cbInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatbotSubmit();
    });
}

function handleChatbotSubmit() {
    const text = cbInput.value.trim();
    if (!text) return;

    // 1. Mostrar mensaje del usuario
    appendMessage(text, 'user-msg');
    cbInput.value = '';

    // 2. Procesar y responder (Simulando pequeño delay)
    setTimeout(() => {
        const reply = generateBotResponse(text);
        appendMessage(reply, 'bot-msg');
    }, 600);
}

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-msg', className);
    msgDiv.innerHTML = `<p>${text}</p>`;
    cbMessages.appendChild(msgDiv);
    
    // Auto scroll bottom
    cbMessages.scrollTop = cbMessages.scrollHeight;
}

function generateBotResponse(input) {
    const txt = input.toLowerCase();

    // Motor simple de palabras clave
    if (txt.includes('hola') || txt.includes('buenas') || txt.includes('saludos')) {
        return "¡Hola! ¿En qué puedo ayudarte hoy? Puedes preguntarme cómo funciona buscar el clima o reportar un error.";
    } 
    else if (txt.includes('clima') || txt.includes('tiempo')) {
        return "Para ver el clima, simplemente usa la barra de búsqueda central o el menú lateral, e ingresa el nombre de la ciudad que deseas.";
    } 
    else if (txt.includes('guardar') || txt.includes('favorito')) {
        return "Una vez busques una ciudad, dale al botón de corazón (<i class='fa-regular fa-heart'></i>) en la tarjeta para guardarla en tu sección 'Guardados' para siempre.";
    } 
    else if (txt.includes('grado') || txt.includes('celsius') || txt.includes('fahrenheit') || txt.includes('unidad')) {
        return "Puedes cambiar entre Celsius (°C) y Fahrenheit (°F) usando el botón de la sección 'Configuración' en el menú lateral.";
    } 
    else if (txt.includes('error') || txt.includes('falla') || txt.includes('contacto') || txt.includes('ayuda')) {
        return "Si estás experimentando problemas o quieres contactarnos, ve a la página de Contacto en nuestro menú. Te responderemos pronto.";
    } 
    else if (txt.includes('gracias')) {
        return "¡Con gusto! Aquí estoy si necesitas algo más.";
    } 
    else if (txt.includes('creador') || txt.includes('desarrollador') || txt.includes('hecho por')) {
        return "Esta app fue desarrollada con ❤️ usando HTML5, CSS Glassmorphism y JS Vanilla.";
    }
    else {
        return "Lo siento, no entendí bien eso. Prueba preguntándome sobre: 'clima', 'guardar favoritos', o 'cambiar grados'.";
    }
}
