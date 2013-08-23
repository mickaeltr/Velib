$(document).ready(function () {

    var apiUrl, station, templates, $view;

    initializeApplication();
    initializeStation();

    /** Initialize application settings + events + listeners */
    function initializeApplication() {

        // Set up API
        apiUrl = "./api/stations";

        // French localization for date displays
        moment.lang($("html").attr("lang"), {
            relativeTime: {
                past: "il y a %s",
                s: "quelques secondes",
                m: "une minute",
                mm: "%d minutes"
            }
        });

        // Cache view DOM element
        $view = $("#velib");

        // Redirect AJAX errors
        $.ajaxSettings.error = onError;

        // Read all templates from <script type="text/template" class="">
        templates = {};
        _.each($("script[type='text/template']"), function (template) {
            var $template = $(template);
            templates[$template.attr("class")] = _.template($template.html());
        });

        // Reinitialize station when URL hash changes
        $(window).on("hashchange", function () {
            if (!station || !window.location.hash || station.number != window.location.hash.slice(1)) {
                initializeStation();
            }
        });

        // Update station from the API regularly (so we know its most recent status)
        window.setInterval(updateStation, moment.duration({minutes: 2}).asMilliseconds());

        // Update view regularly (so we know how much time from now was the last update)
        window.setInterval(onStationUpdate, moment.duration({seconds: 30}).asMilliseconds());
    }

    /** Initialize station from URL hash or geo location */
    function initializeStation() {
        if (window.location.hash) {
            setStation({number: window.location.hash.slice(1)});
            updateStation();
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                $.getJSON(apiUrl, function (stations) {
                    // Filter stations which are opened
                    stations = _.filter(stations, {status: "OPEN"});
                    // Calculate the distance for each station
                    _.each(stations, function (station) {
                        station.distance = Math.sqrt(
                            Math.pow(station.position.lng - position.coords.longitude, 2)
                                + Math.pow(station.position.lat - position.coords.latitude, 2)
                        );
                    });
                    // Find the nearest station
                    setStation(_.find(stations, {distance: Math.min.apply(null, _.pluck(stations, "distance"))}));
                    onStationUpdate();
                });
            }, onError);
        } else {
            onError();
        }
    }

    /** Set station attributes */
    function setStation(data) {
        station = data;
        if (station.number) {
            // Update the URL according to the station
            window.location.hash = station.number;
            // Make the station name nicer
            if (station.name) {
                // Strip the station number from the station name
                station.name = station.name.replace(/[0-9]+ \- /, "");
                // Capitalize (only) the first letter of each word
                station.name = station.name.replace(/\w\S*/g, function (word) {
                    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
                });
            }
        }
    }

    /** Update station from API */
    function updateStation() {
        if (station) {
            $.getJSON(apiUrl + "/" + station.number, function (data) {
                setStation(data);
                onStationUpdate();
            });
        }
    }

    /** Update view + title when the station is updated */
    function onStationUpdate() {
        if (station && station.status === "OPEN") {
            station.last_update_from_now = moment(station.last_update).fromNow();
            station.availability = station.available_bikes > 5 ? "success" : station.available_bikes > 1 ? "warning" : "error";
            $view.html(templates.success(station));
            document.title = templates.titleSuccess(station);
        } else {
            onError();
        }
    }

    /** Display specific view + title on error */
    function onError() {
        station = null;
        $view.html(templates.error());
        document.title = templates.titleError();
    }
});