// Input handling for the main page (Gantt 3.2.3).
// Owns the single source of truth for what the user has chosen:
//   window.AppState.get() -> {county, mode, startYear, endYear}
// and announces every change with
//   document "appstatechange" event, detail: the same frozen state object.
// Invalid input shows an error and never changes the state.
(function () {
    const appState = AppStateUtils.createAppState(
        { county: null, mode: "single", startYear: null, endYear: null },
        state => document.dispatchEvent(new CustomEvent("appstatechange", { detail: state }))
    );
    window.AppState = Object.freeze({ get: () => appState.get() });

    const startInput = document.getElementById("start-year");
    const endInput = document.getElementById("end-year");
    const endGroup = document.getElementById("end-year-group");
    const startLabel = document.getElementById("start-year-label");
    const errorBox = document.getElementById("year-error");
    const modeRadios = document.querySelectorAll('input[name="year-mode"]');

    let years = null; // set once county data has loaded

    function currentMode() {
        const checked = document.querySelector('input[name="year-mode"]:checked');
        return checked ? checked.value : "single";
    }

    function showErrors(errors, mode) {
        startInput.setAttribute("aria-invalid", errors.start ? "true" : "false");
        endInput.setAttribute("aria-invalid", errors.end ? "true" : "false");
        const messages = [];
        if (errors.start) messages.push(mode === "range" ? `Start year: ${errors.start}` : errors.start);
        if (errors.end) messages.push(`End year: ${errors.end}`);
        errorBox.textContent = messages.join(" ");
    }

    function applyYears() {
        if (!years) return;
        const mode = currentMode();
        const result = Validation.validateYears(
            { mode, start: startInput.value, end: endInput.value },
            years
        );
        if (!result.ok) {
            showErrors(result.errors, mode);
            return;
        }
        showErrors({}, mode);
        appState.update({ mode: result.mode, startYear: result.startYear, endYear: result.endYear });
    }

    function onModeChange() {
        const range = currentMode() === "range";
        endGroup.hidden = !range;
        startLabel.textContent = range ? "Start year" : "Year";
        if (range && endInput.value.trim() === "" && years) {
            endInput.value = years[years.length - 1];
        }
        applyYears();
    }

    function init() {
        years = window.CountyData.years;
        const min = years[0];
        const max = years[years.length - 1];
        for (const input of [startInput, endInput]) {
            input.min = min;
            input.max = max;
        }
        if (startInput.value.trim() === "") startInput.value = max;
        onModeChange();
        initCountySearch();
    }

    startInput.addEventListener("change", applyYears);
    endInput.addEventListener("change", applyYears);
    modeRadios.forEach(radio => radio.addEventListener("change", onModeChange));


    // ---- County search ----
    const countyInput = document.getElementById("county-search");
    const countyOptions = document.getElementById("county-options");
    const countyError = document.getElementById("county-error");
    let fipsByName = null; // display name -> FIPS, set once data has loaded

    function showCountyError(message) {
        countyError.textContent = message;
        countyInput.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function applyCountySearch() {
        if (!fipsByName) return;
        const result = Validation.matchCountyName(countyInput.value, Object.keys(fipsByName));
        if (!result.ok) {
            showCountyError(result.error);
            return;
        }
        showCountyError("");
        if (result.name) countyInput.value = result.name; // complete "san d" -> "San Diego"
        window.MapView.selectCountyByFips(result.name ? fipsByName[result.name] : null);
    }

    function initCountySearch() {
        fipsByName = {};
        for (const county of Object.values(window.CountyData.byFips)) {
            fipsByName[county.name] = county.fips;
        }
        const names = Object.keys(fipsByName).sort((a, b) => a.localeCompare(b));
        countyOptions.replaceChildren(...names.map(name => {
            const option = document.createElement("option");
            option.value = name;
            return option;
        }));
    }

    // "change" fires on Enter, on blur, and when a suggestion is picked;
    // "search" fires when the clear (x) button is used.
    countyInput.addEventListener("change", applyCountySearch);
    countyInput.addEventListener("search", applyCountySearch);

    // The map reports every (un)selection, whether it came from a click or from
    // this search box, so this is the one place the county enters the state.
    document.addEventListener("countyselected", event => {
        const fips = event.detail.fips;
        const county = fips && window.CountyData && window.CountyData.byFips[fips];
        countyInput.value = county ? county.name : "";
        showCountyError("");
        appState.update({ county: fips });
    });

    if (window.CountyData) {
        init();
    } else {
        document.addEventListener("countydataloaded", init, { once: true });
    }
})();
