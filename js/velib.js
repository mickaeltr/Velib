$(document).ready(function () {

    var station = {}, templates = {};
    initialize();
    updateStation();

    function initialize() {

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

        // Update station when URL hash changes
        $(window).on("hashchange", updateStation);

        // Update station model regularly (we want to know its current status)
        window.setInterval(updateStation, moment.duration({minutes: 2}).asMilliseconds());

        // Update station view regularly (we want to know how much time from now was the last update)
        window.setInterval(onStationUpdate, moment.duration({seconds: 15}).asMilliseconds());
    }

    function updateStation() {
        station.number = window.location.hash.slice(1);
        if (station.number) {
            $.getJSON("https://api.jcdecaux.com/vls/v1/stations/" + station.number + "?callback=?&" + $.param({
                contract: "Paris",
                apiKey: "123f915ca9bfdb956117a82244e4b37203c55f07"
            }), function (data) {
                station = data;
                onStationUpdate();
            });
        } else {
            onError();
        }
    }

    function onStationUpdate() {
        station.last_update_from_now = moment(station.last_update).fromNow();
        station.availability = getAvailability();
        $("#velib").html(templates.success(station));
        document.title = templates.titleSuccess(station);
    }

    function onError() {
        $("#velib").html(templates.error());
        document.title = templates.titleError();
    }

    function getAvailability() {
        if(station.available_bikes > 5) {
            return "success";
        }
        if(station.available_bikes > 1) {
            return "warning";
        }
        return "error";
    }
});