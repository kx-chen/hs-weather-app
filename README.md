# Hootsuite Weather App
[![Build Status](https://travis-ci.com/kx-chen/hs-weather-app.svg?branch=master)](https://travis-ci.com/kx-chen/hs-weather-app)

> Get weather results right in your Hootsuite dashboard!

TODO: 
- [ ] Change class names in HTML from `hs_*`
- [x] Remove repetition in tests, especially with the dummy data and dummy response JSON
- [x] Remove inline HTML
- [ ] Refactor return types of responses/geocode results to proper objects
    - [x] in tests
    - [ ] in app code
- [ ] Add eventlisteners instead of using `onclick` in HTML
- [x] Extract all error messages, class selectors, strings, urls into own file
- [ ] Shorten code to under 80 columns


Possible improvements: 
- Comparison with already existing WeatherModels when adding new locations so 
all locations don't have to refresh when adding a new location