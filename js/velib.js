$(document).ready(function () {

    var api, station, templates;
    initializeApplication();
    initializeStation();

    function initializeApplication() {

        api = {
            url: "https://api.jcdecaux.com/vls/v1/stations",
            params: "?callback=?&" + $.param({
                contract: "Paris",
                apiKey: "123f915ca9bfdb956117a82244e4b37203c55f07"
            })
        };

        // French localization for date displays
        moment.lang($("html").attr("lang"), {
            relativeTime: {
                past: "il y a %s",
                s: "quelques secondes",
                m: "une minute",
                mm: "%d minutes"
            }
        });

        $.ajaxSettings.error = onError;

        // Read all templates from <script type="text/template" class="***">
        templates = {};
        _.each($("script[type='text/template']"), function (template) {
            var $template = $(template);
            templates[$template.attr("class")] = _.template($template.html());
        });

        // Reinitialize station when URL hash changes
        $(window).on("hashchange", function() {
            if(!station || !window.location.hash || station.number != window.location.hash.slice(1)) {
                initializeStation();
            }
        });

        // Update station model regularly (we want to know its current status)
        window.setInterval(updateStation, moment.duration({minutes: 2}).asMilliseconds());

        // Update station view regularly (we want to know how much time from now was the last update)
        window.setInterval(onStationUpdate, moment.duration({seconds: 30}).asMilliseconds());
    }

    function initializeStation() {
        if (window.location.hash) {
            station = {number: window.location.hash.slice(1)};
            updateStation();
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                $.getJSON(api.url + api.params, function (stations) {
                    // Calculate the distance for each station
                    _.each(stations, function (station) {
                        station.distance = Math.sqrt(
                            Math.pow(station.position.lng - position.coords.longitude, 2)
                                + Math.pow(station.position.lat - position.coords.latitude, 2)
                        );
                    });
                    // Find the nearest station
                    station = _.find(stations, {distance: Math.min.apply(null, _.pluck(stations, "distance"))});
                    window.location.hash = station.number;
                    onStationUpdate();
                });
            }, onError);
        } else {
            onError();
        }
    }

    function updateStation() {
        if (station) {
            $.getJSON(api.url + "/" + station.number + api.params, function (data) {
                station = data;
                onStationUpdate();
            });
        }
    }

    function onStationUpdate() {
        if (station && station.status === "OPEN") {
            station.name = station.name.replace(station.number + " - ", "");
            station.last_update_from_now = moment(station.last_update).fromNow();
            station.availability = station.available_bikes > 5 ? "success" : station.available_bikes > 1 ? "warning" : "error";
            $("#velib").html(templates.success(station));
            document.title = templates.titleSuccess(station);
        } else {
            onError();
        }
    }

    function onError() {
        station = null;
        $("#velib").html(templates.error());
        document.title = templates.titleError();
    }
});