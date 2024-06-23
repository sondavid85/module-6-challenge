// consts
const API_KEY = "d2c8556859925903e33b931f581ce7e8";
const DAYS_OF_WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

if (localStorage.getItem("currentLat") === null) {
    localStorage.setItem("currentLat", 34.05);
}
if (localStorage.getItem("currentLong") === null) {
    localStorage.setItem("currentLong", -118.24);
}
if (localStorage.getItem("searchHistory") === null) {
    localStorage.setItem("searchHistory", JSON.stringify([]));
}
if (localStorage.getItem("days") === null) {
    localStorage.setItem("days", JSON.stringify([]));
}

// events
document.addEventListener("DOMContentLoaded", async function(event) {
    setFooter();
    setSearchHistory();
    await updateContent();

    document.getElementById("search").addEventListener('click', async function() {
        const locationName = document.getElementById("city-input").value;
        await searchLocation(locationName);
    });

    document.getElementById("city-input").addEventListener('keydown', async function(e) {
        const locationName = document.getElementById("city-input").value;
        if (e.key === "Enter" && locationName){
            e.preventDefault();
            await searchLocation(locationName);
        }
    });

    document.getElementById("use-my-location").addEventListener('click', async function() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(async function(position) {
                localStorage.setItem("currentLat", position.coords.latitude);
                localStorage.setItem("currentLong", position.coords.longitude);
                await updateContent();
            }, function(error) {
                console.error('Error occurred: ', error);
            });
        } else {
            console.log('Geolocation is not supported by your browser');
        }
    });
});

// modal
// Get the modal
var modal = document.getElementById("modal");

// Get the button that opens the modal
var btns = document.getElementsByClassName("forecast-item");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

var modalText = document.getElementById("modal-text");

for(let i = 0; i < btns.length; i++){
    let btn = btns[i];
    btn.onclick = function() {
        let day = btn.dataset.day;
        modalText.innerText = JSON.stringify(JSON.parse(localStorage.getItem("days"))[day], null, 4);
        modal.style.display = "block";
      }
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

// data fetching
async function fetchForecast(){
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${localStorage.getItem("currentLat")}&lon=${localStorage.getItem("currentLong")}&units=imperial&appid=${API_KEY}`);
    let forecast = await response.json();
    return forecast;
}

async function fetchCurrentWeather(){
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${localStorage.getItem("currentLat")}&lon=${localStorage.getItem("currentLong")}&units=imperial&appid=${API_KEY}`;
    try {
        const response = await fetch(url);
        const weather = await response.json();
        return weather ? weather : null;
    }
    catch (e){
        console.error('Failed to fetch current weather', e);
    }
}

async function searchLocation(locationName){
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${locationName}&limit=5&appid=${API_KEY}`;

    try {
        clearError();

        const response = await fetch(url);
        const locations = await response.json();

        if (locations.length > 0){
            let location = locations[0];
            localStorage.setItem("currentLat", location.lat);
            localStorage.setItem("currentLong", location.lon);

            let currentWeather = await fetchCurrentWeather();
            let forecast = await fetchForecast();
            let searchHistory = JSON.parse(localStorage.getItem("searchHistory"));
            searchHistory.unshift({name: currentWeather.name, lat: location.lat, lon: location.lon});
            localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
            setSearchHistory();
            
            setCurrentWeather(currentWeather);
            setForecast(forecast.list);
        }
        else {
            showError("City not found!");
        }
    } catch (error) {
        console.error('Failed to fetch location data', error);
    }
}

// dom updates
function setSearchHistory(){
    let $history = document.getElementById("search-history");
    let innerHtml = "";
    let searchHistory = JSON.parse(localStorage.getItem("searchHistory"));
    searchHistory.map((h, i) => {
        innerHtml += `<li class="no-decoration"><button type="button" onclick="historyClick(this)" class="history left-nav-button" data-lat=${h.lat} data-lon=${h.lon}>${h.name}</li>`
    });

    $history.innerHTML = innerHtml;
}

async function historyClick(elem){
    let lat = elem.getAttribute('data-lat');
    let lon = elem.getAttribute('data-lon');

    localStorage.setItem("currentLat", lat);
    localStorage.setItem("currentLong", lon);

    await updateContent();
}

async function updateContent(){
    let currentWeather = await fetchCurrentWeather();
    let forecast = await fetchForecast();
    
    setCurrentWeather(currentWeather);
    setForecast(forecast.list);
}

function setCurrentWeather(current){
    let cityName = current.name;
    let currentDate = getFormattedDate(new Date(), true);
    let tempNum = current.main.temp;
    let tempClass = tempNum > 80 ? "hot" : tempNum < 60 ? "cold" : "";
    let currentTemp = `<strong>Temp:</strong> <span class="${tempClass}">${current.main.temp}° F</span>`;
    let currentWind = `<strong>Wind:</strong> ${current.wind.speed} mph`;
    let currentHumidity = `<strong>Humidity:</strong> ${current.main.humidity}%`;
    let icon = current.weather[0].icon;

    let $cityName = document.getElementById("city-name");
    let $cityWeatherIcon = document.getElementById("city-weather-icon-container");
    let $temp = document.getElementById("city-temp");
    let $wind = document.getElementById("city-wind");
    let $humidity = document.getElementById("city-humidity");

    $cityName.innerHTML = `${cityName} (${currentDate})`;
    $cityWeatherIcon.innerHTML = `<img id="city-weather-img" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="weather icon" />`
    $temp.innerHTML = currentTemp;
    $wind.innerHTML = currentWind;
    $humidity.innerHTML = currentHumidity;
};

// Function to parse the date from 'dt_txt' and group by date
function groupByDate(data) {
    return data.reduce((acc, item) => {
        const date = item.dt_txt.split(' ')[0]; // Extract the date part
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {});
}

// Function to select the "12:00:00" instance from each grouped date, fallback to middle instance
function selectNoonOrFirstInstances(groupedData) {
    const dates = Object.keys(groupedData).sort(); // Ensure the dates are sorted
    return dates.slice(0, 5).map(date => {
        const items = groupedData[date];
        const noonItem = items.find(item => item.dt_txt.includes('12:00:00'));
        // If no "12:00:00" timestamp, select the middle item
        return noonItem || items[0];
    });
}

function setForecast(forecast){
    // let day1 = forecast.splice(0, 7);
    // let day2 = forecast.splice(0, 7);
    // let day3 = forecast.splice(0, 7);
    // let day4 = forecast.splice(0, 7);
    // let day5 = forecast.splice(0, 7);
    // let days = [day1, day2, day3, day4, day5];

    let groupedByDate = groupByDate(forecast);
    let days = selectNoonOrFirstInstances(groupedByDate);

    resetLocalStorageDays();

    for (let i = 0; i < days.length; i++){
        let day = days[i];

        addDayToLocalStorage(day);
        let unixEpoch = day.dt;
        let date = new Date(unixEpoch * 1000);
        //let date = new Date();
        let formattedDate = getFormattedDate(date, false);
        let dayOfWeek = DAYS_OF_WEEK[date.getDay()];
        let tempNum = day.main.temp;
        let tempClass = tempNum > 80 ? "hot" : tempNum < 60 ? "cold" : "";
        let temp = `<strong>Temp:</strong> ${day.main.temp}° F`;
        let wind = `<strong>Wind:</strong> ${day.wind.speed} mph`;
        let humidity = `<strong>Humidity:</strong> ${day.main.humidity}%`;
        let icon = day.weather[0].icon;
        let description = day.weather[0].description;

        let $day = document.getElementById(`day-${i+1}`);
        $day.innerHTML = `
            <div class="forecast-card">
                <h4>${dayOfWeek} ${formattedDate}</h4>
                <hr />
                <p class="weather-description">${description}</p>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
                <ul class="forecast-card-list">
                    <li class=${tempClass}>${temp}</li>
                    <li>${wind}</li>
                    <li>${humidity}</li>
                </ul>
            </div>
        `
    }
}

// utility functions
function getFormattedDate(date, includeYear) {
    let year = date.getFullYear();

    let month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;

    let day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;

    return includeYear ? month + '/' + day + '/' + year : month + '/' + day;
}

function showError(message){
    let $error = document.getElementById("error-message");
    $error.innerText = message;
}

function clearError(){
    let $error = document.getElementById("error-message");
    $error.innerText = "";
}

function setFooter() {
    document.getElementById("footer").innerHTML = `Copyright ${new Date().getFullYear()}`;
}

function addDayToLocalStorage(day){
    let days = JSON.parse(localStorage.getItem("days"));
    days.push(day);
    localStorage.setItem("days",JSON.stringify(days));
}

function resetLocalStorageDays(){
    localStorage.setItem("days", JSON.stringify([]));
}