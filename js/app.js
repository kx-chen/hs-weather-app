let weatherApp;
let config = {
    "units": "metric",
    "weather_base_url": "",
    "more_info_url": "",
};

// TODO: DRY with objects that have lat/lng
document.addEventListener('DOMContentLoaded', async function () {
    hsp.init({useTheme: true});
    init();
    loadTopBars();
    bindApiButtons();

    hsp.bind('refresh', () => weatherApp.init());
    $('[data-toggle="tooltip"]').tooltip();
});


function WeatherModel(lat, lng, weatherID, full_name) {
    this.id = weatherID;
    this.temperature = '';
    this.name = '';
    this.icon = '';
    this.weather = '';
    this.lat = lat;
    this.lng = lng;
    this.full_name = full_name;


    this.init = async () => {
        this.weatherJson = await this.lookup();
        this.weatherResult = await this.parseWeatherResults();
    };

    this.lookup = async () => {
        // TODO: fix return types
        let weatherJson = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${this.lat}&lon=${this.lng}&appid=6cfd34fc94e03afb78bee39afd8989bb&units=${config.units}`);

        if (weatherJson.status === 200) {
            return await weatherJson.json();
        }
        return false;
    };

    this.parseWeatherResults = async () => {
        this.temperature = this.weatherJson['main']['temp'];
        this.weather = this.weatherJson['weather'][0]['main'];
        this.name = this.weatherJson['name'];
        this.icon = `http://openweathermap.org/img/wn/${this.weatherJson['weather'][0]['icon']}@2x.png`;
    };
}



function WeatherView(weatherModel) {
    this.weather = weatherModel;

    this.render = () => {
        let weatherDiv = document.getElementById('weather');

        weatherDiv.insertAdjacentHTML('afterbegin',
            `<div class="hs_message" id="${this.weather.id}">
      <div class="hs_avatar">
        <img src="${this.weather.icon}" class="hs_avatarImage" alt="Avatar">
      </div>

      <div class="hs_content">
        <a onclick="hsp.showCustomPopup('https://hs-weather-app.herokuapp.com/weather/${this.weather.lat}/${this.weather.lng}', 
        'Weather for ${this.weather.full_name}', 900, 500);" class="hs_userName" target="_blank">${this.weather.full_name}</a>
        <div class="hs_contentText">
          <p>
            <span class="hs_postBody">${this.weather.temperature} Degrees | ${this.weather.weather}</span>
            <button class="remove_location close" 
                    type="button" 
                    data-toggle="tooltip"
                    title="Remove"
                    data-dismiss="alert" 
                    aria-label="Close"
                    onclick="weatherApp.removeLocation(${this.weather.id});">X</button>
          </p>
        </div>
      </div>
    </div>`);
    };
}

function WeatherController() {
    this.weatherModels = [];

    this.getLocations = async () => {
        return new Promise((resolve) => {
            hsp.getData((data) => {
                resolve(data);
            });
        }).catch((err) => console.log(err));
    };

    this.init = async () => {
        this.locations = await this.getLocations();
        this.weatherModels = [];

        if (this.locations) {
            clearDivContents('weather');

            for (let i = 0; i < this.locations.length; i++) {
                if (this.locations[i]) {
                    let lat = this.locations[i].lat;
                    let lng = this.locations[i].lng;
                    let full_name = this.locations[i].full_name;

                    let model = new WeatherModel(lat, lng, i, full_name);
                    await model.init();

                    new WeatherView(model).render();
                    this.weatherModels.push(model);
                }
            }
            this.updateLastUpdated();
        }
    };

    this.updateLastUpdated = () => {
        document.getElementById('last_updated').innerHTML = `Last updated: ${new Date()}`;
    };

    this.addLocation = async () => {
        let locationForm = document.getElementById('autocomplete');
        let cityToLookup = locationForm.value;
        locationForm.value = '';

        let otherResult = await getLatLng(cityToLookup);

        if (!cityToLookup) return;
        let res = await checkIfLocationValid({
            "lat": otherResult.lat,
            "lng": otherResult.lng,
        });

        if (!res) {
            displayError({
                "message": "Location not found, please try again.",
            });
            return;
        }

        let locations = await this.getLocations();
        if (!locations) {
            locations = [];
        }
        locations.push({
            "full_name": cityToLookup,
            "lat": otherResult.lat,
            "lng": otherResult.lng,
        });

        hsp.saveData(locations, () => {
            this.init();
        });
    };


    this.removeLocation = async (index) => {
        deleteDiv(index);

        let locationsList = [];

        this.weatherModels = this.weatherModels.filter((result) => {
            return !(result.id === index);
        });

        this.weatherModels.forEach((result) => {
            locationsList.push({
                "full_name": result.full_name,
                "lat": result.lat,
                "lng": result.lng,
            });
        });

        hsp.saveData(locationsList);
    };
}

function init() {
    weatherApp = new WeatherController();
    weatherApp.init();
}
