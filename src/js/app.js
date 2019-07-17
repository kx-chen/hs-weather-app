let weatherApp;
let settings = {
    "units": "metric",
};


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
        let weatherJson = await fetch(`https://cors-anywhere.herokuapp.com/https://api.darksky.net/forecast/fd54318453b002e6ef5e89e7fa7d7f65/${this.lat},${this.lng}?units=ca`, {
            "headers": new Headers({
                "origin": window.location,
            })
        }).catch(() =>{
            displayError({
                "message": "Sorry! Something went wrong."
            }, false);
        });

        if (weatherJson.status === 200) {
            return await weatherJson.json();
        }

        displayError({
            "message": "Sorry! Something went wrong."
        }, false);
        document.getElementById('loading').style.display = 'none';
        return false;
    };

    this.parseWeatherResults = async () => {
        this.temperature = Math.round(this.weatherJson['currently']['temperature']);
        this.weather = this.weatherJson['currently']['summary'];
        this.icon = `https://darksky.net/images/weather-icons/${this.weatherJson['currently']['icon']}.png`;
        if(this.weatherJson['alerts']) this.alerts = this.weatherJson['alerts'];
    };
}


function WeatherView(weatherModel) {
    this.weather = weatherModel;

    this.render = () => {
        let weatherDiv = document.getElementById('weather');
        // TODO: Event listener
        weatherDiv.insertAdjacentHTML('afterbegin',
            `<div class="hs_message" id="${this.weather.id}">
                  <div class="hs_avatar">
                    <img src="${this.weather.icon}" class="hs_avatarImage" alt="Avatar">
                  </div>

                  <div class="hs_content">
                    <a onclick="hsp.showCustomPopup('https://hs-weather-app.herokuapp.com/weather/${this.weather.lat}/${this.weather.lng}',
                    'Weather for ${this.weather.full_name}');" class="hs_userName" target="_blank">${this.weather.full_name}</a>

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
        if(this.weather['alerts']) {
            document.getElementById(this.weather.id).insertAdjacentHTML('beforeend',
                `<div class="alert alert-info fade show" role="alert">
<!--                           <h5><strong>${this.weather.full_name}:</strong></h5>-->
                            <p>${this.weather['alerts'][0]['title']}</p>
                           <a href="${this.weather['alerts'][0]['uri']}" target="_blank">Read More</a>
                       </div>
            `)
        }
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

    this.refresh = async () => {
        this.locations = await this.getLocations();
        this.weatherModels = [];

        if(this.locations.length > 0) {
            document.getElementById('no-locations').style.display = 'none';
        }
        document.getElementById('weather').style.display = 'none';
        document.getElementById('loading').style.display = 'block';
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
        document.getElementById('weather').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
    };

    this.updateLastUpdated = () => {
        document.getElementById('last_updated').innerHTML = `Last updated: ${new Date()}`;
    };

    this.addLocation = async () => {
        let locationForm = document.getElementById('autocomplete');
        let cityToLookup = locationForm.value;
        if (!cityToLookup) return;

        let address = await getAutocompleteAddress();
        let lookupGeometry = await getLatLng(address);

        // TODO: turn into object for easy compare
        let res = await checkIfLocationValid({
            "lat": lookupGeometry.lat,
            "lng": lookupGeometry.lng,
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

        // TODO: extract into a constant
        if (locations.length >= 10) {
            displayError({
                "message": "Sorry, you can't have more than 10 locations!"
            }, true);
            return;
        }
        for(let i = 0; i < locations.length; i++) {
            let latInt = parseFloat(locations[i].lat);
            let lngInt = parseFloat(locations[i].lng);
            if (latInt === lookupGeometry.lat && lngInt === lookupGeometry.lng) {
                displayError({
                    "message": "Location already exists"
                });
                return;
            }
        }
        locations.push({
            "full_name": cityToLookup,
            "lat": lookupGeometry.lat,
            "lng": lookupGeometry.lng,
        });
        locationForm.value = '';

        if(locations.length > 0) {
            document.getElementById('no-locations').style.display = 'none';
        }

        hsp.saveData(locations, () => {
            this.refresh();
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

        if(locationsList.length === 0) {
            document.getElementById('no-locations').style.display = 'block';
            document.getElementById('last_updated').innerHTML = 'Last updated: never';
        }

        hsp.saveData(locationsList);
    };
}

function init() {
    weatherApp = new WeatherController();
    weatherApp.refresh();
}


document.addEventListener('DOMContentLoaded',  () => {
    hsp.init({useTheme: true});
    init();
    loadTopBars();

    hsp.bind('refresh', () => weatherApp.refresh());
    $('[data-toggle="tooltip"]').tooltip();
});
