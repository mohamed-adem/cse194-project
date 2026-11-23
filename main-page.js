const countyPaths = document.querySelectorAll("#svg-holder svg path[id]");

const previewSVG = document.getElementById("county-preview-svg");
const countyName = document.getElementById("county-name");
const countyYear = document.getElementById("county-year");
const countyHomeValue = document.getElementById("county-home-value");
const countyIncome = document.getElementById("county-income");

// Loaded county data (see js/county-data.js). Null until the fetch completes.
let countyIndex = null;
let loadFailed = false;
const metricSelect = document.getElementById('map-metric');
const changeFields = ['county-home-change','county-income-change','county-growth-gap'].map(id => document.getElementById(id));
function renderCountyMap() {
    if (!countyIndex) return;
    const {startYear,endYear} = yearRange;
    const range = yearRange.mode === "range";
    metricSelect.querySelector('[value="gap"]').disabled = !range;
    if (!range && metricSelect.value === 'gap') metricSelect.value = 'homeValueUsd';
    const metric = metricSelect.value;
    const values = [...countyPaths].map(path => MapMetrics.value(
        CountyDataUtils.getRecord(countyIndex,path.dataset.fips,startYear),
        CountyDataUtils.getRecord(countyIndex,path.dataset.fips,endYear),metric,range));
    const bounds = MapMetrics.scale(values,range);
    const label = MapMetrics.metrics[metric] + (range && metric !== 'gap' ? ' change' : '');
    const period = range ? `${startYear}–${endYear}` : String(endYear);
    countyPaths.forEach((path,i) => {
        path.style.fill = MapMetrics.color(values[i],bounds,range);
        path.setAttribute('aria-label',`${countyIndex.bySvgId[path.id]?.name || path.id} County: ${label}, ${period}, ${MapMetrics.format(values[i],metric,range)}`);
    });
    const count = values.filter(v => typeof v === 'number' && Number.isFinite(v)).length;
    document.getElementById('map-summary').textContent = `${label}, ${period}. Data available for ${count} of ${countyPaths.length} counties.`;
    const bar = document.getElementById('map-color-bar');
    bar.hidden = !count;
    bar.style.background = range ? 'linear-gradient(to right,hsl(215,70%,45%),#f7f7f7,hsl(25,70%,45%))' : 'linear-gradient(to right,hsl(210,65%,92%),hsl(210,65%,30%))';
    document.getElementById('map-legend').textContent = count ? `${MapMetrics.format(bounds.min,metric,range)} to ${MapMetrics.format(bounds.max,metric,range)}. ${range ? 'Blue: negative; white: zero; orange: positive.' : 'Light to dark: lower to higher.'} Gray: no data.` : 'No data for this measure and year range.';
    restoreSelectedPreview();
}
metricSelect.addEventListener('change',renderCountyMap);
// Years shown in the panel; updated by inputs.js through the "appstatechange" event.
let yearRange = { startYear: null, endYear: null };

function showCountyValues(path) {
    if (!countyIndex) {
        countyHomeValue.textContent = loadFailed ? "Data unavailable" : "Loading...";
        countyIncome.textContent = countyHomeValue.textContent;
        return;
    }
    const { startYear, endYear } = yearRange;
    const fips = path.dataset.fips;
    const end = CountyDataUtils.getRecord(countyIndex, fips, endYear);
    const fmt = (record, key) => CountyDataUtils.formatUsd(record && record[key]);

    const first = CountyDataUtils.getRecord(countyIndex,fips,startYear);
    ['homeValueUsd','perCapitaPersonalIncomeUsd','gap'].forEach((metric,i) => {
        changeFields[i].textContent = yearRange.mode !== 'range' ? 'Choose a year range' : MapMetrics.format(MapMetrics.value(first,end,metric,true),metric,true);
    });
    if (yearRange.mode !== "range") {
        countyYear.textContent = endYear;
        countyHomeValue.textContent = fmt(end, "homeValueUsd");
        countyIncome.textContent = fmt(end, "perCapitaPersonalIncomeUsd");
        return;
    }
    // Keep endpoint values alongside the calculated changes.
    const start = CountyDataUtils.getRecord(countyIndex, fips, startYear);
    countyYear.textContent = `${startYear} to ${endYear}`;
    countyHomeValue.textContent = `${fmt(start, "homeValueUsd")} to ${fmt(end, "homeValueUsd")}`;
    countyIncome.textContent =
        `${fmt(start, "perCapitaPersonalIncomeUsd")} to ${fmt(end, "perCapitaPersonalIncomeUsd")}`;
}

document.addEventListener("appstatechange", event => {
    const { mode, startYear, endYear } = event.detail;
    if (mode === yearRange.mode && startYear === yearRange.startYear && endYear === yearRange.endYear) return;
    if (startYear === null || endYear === null) return;
    yearRange = { mode, startYear, endYear };
    renderCountyMap();
});

function showCountyPreview(path) {
    const county = countyIndex && countyIndex.bySvgId[path.id];
    countyName.textContent = county ? county.name : path.id;

    const bounds = path.getBBox();
    const padding = 10;

    previewSVG.setAttribute(
        "viewBox",
        `${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`
    );

    previewSVG.innerHTML = "";

    const countyCopy = path.cloneNode(true);
    countyCopy.removeAttribute("id");
    for (const attr of ['tabindex','role','aria-label','aria-pressed']) countyCopy.removeAttribute(attr);
    countyCopy.setAttribute('aria-hidden','true');

    previewSVG.appendChild(countyCopy);

    showCountyValues(path);
}

function clearCountyPreview() {
    countyName.textContent = "Choose a county";
    previewSVG.innerHTML = "";
    countyYear.textContent = "-";
    countyHomeValue.textContent = "-";
    countyIncome.textContent = "-";
    changeFields.forEach(field => { field.textContent = "-"; });
}


// ---- Selection ----
const mapSVG = document.querySelector("#svg-holder svg");
let selectedPath = null;
let selectionOutline = null;

// Draws the selected county's outline on top of its neighbours without
// reordering the DOM (which would change keyboard tab order).
function drawSelectionOutline(path) {
    if (selectionOutline) selectionOutline.remove();
    selectionOutline = null;
    if (!path) return;
    selectionOutline = path.cloneNode(false);
    selectionOutline.removeAttribute("id");
    selectionOutline.removeAttribute("tabindex");
    selectionOutline.removeAttribute("aria-label");
    selectionOutline.removeAttribute("role");
    selectionOutline.removeAttribute("style");
    selectionOutline.setAttribute("class", "selection-outline");
    selectionOutline.setAttribute("aria-hidden", "true");
    mapSVG.appendChild(selectionOutline);
}

function selectCounty(path) {
    if (selectedPath) {
        selectedPath.classList.remove("selected");
        selectedPath.setAttribute("aria-pressed", "false");
    }
    selectedPath = path;
    if (path) {
        path.classList.add("selected");
        path.setAttribute("aria-pressed", "true");
        showCountyPreview(path);
    } else {
        clearCountyPreview();
    }
    drawSelectionOutline(path);
    // Lets the county search box (inputs.js) follow map clicks.
    document.dispatchEvent(new CustomEvent("countyselected", {
        detail: { fips: path ? path.dataset.fips || null : null },
    }));
}

// Lets other code (e.g. the county search box) select a county by FIPS code.
// Pass null to clear the selection. Returns false if the FIPS code is unknown.
function selectCountyByFips(fips) {
    if (fips === null) {
        if (selectedPath) selectCounty(null);
        return true;
    }
    const county = countyIndex && countyIndex.byFips[fips];
    const path = county && document.getElementById(county.svgId);
    if (!path) return false;
    if (path !== selectedPath) selectCounty(path);
    return true;
}

window.MapView = Object.freeze({ selectCountyByFips });

// When the pointer/focus leaves a county, fall back to the selected one.
function restoreSelectedPreview() {
    if (selectedPath) {
        showCountyPreview(selectedPath);
    } else {
        clearCountyPreview();
    }
}

countyPaths.forEach(path => {
    path.setAttribute("tabindex", path === countyPaths[0] ? "0" : "-1");
    path.setAttribute("role", "button");
    path.setAttribute("aria-pressed", "false");
    path.setAttribute("aria-label", `${path.id} County`);

    path.addEventListener("mouseenter", () => showCountyPreview(path));
    path.addEventListener("focus", () => {
        mapSVG.querySelector('path[tabindex="0"]')?.setAttribute("tabindex", "-1");
        path.setAttribute("tabindex", "0");
        showCountyPreview(path);
    });
    path.addEventListener("blur", restoreSelectedPreview);
    // Clicking the already-selected county unselects it.
    const toggleSelection = () => {
        if (selectedPath === path) {
            selectCounty(null);
            showCountyPreview(path); // pointer/focus is still on it
        } else {
            selectCounty(path);
        }
    };
    path.addEventListener("click", toggleSelection);
    path.addEventListener("keydown", event => {
        const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (steps[event.key]) {
            event.preventDefault();
            const index = Array.from(countyPaths).indexOf(path);
            countyPaths[(index + steps[event.key] + countyPaths.length) % countyPaths.length].focus();
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleSelection();
        }
    });
});

mapSVG.addEventListener("mouseleave", restoreSelectedPreview);


async function loadCountyData() {
    const response = await fetch("data/county-data.json");
    if (!response.ok) {
        throw new Error(`Failed to load county data: HTTP ${response.status}`);
    }
    countyIndex = CountyDataUtils.buildIndex(await response.json());
    const latestYear = countyIndex.years[countyIndex.years.length - 1];
    yearRange = { startYear: latestYear, endYear: latestYear };

    countyPaths.forEach(path => {
        const county = countyIndex.bySvgId[path.id];
        if (county) {
            path.dataset.fips = county.fips;
            path.setAttribute("aria-label", `${county.name} County`);
        } else {
            console.warn(`Map county "${path.id}" has no matching entry in county-data.json`);
        }
    });
    renderCountyMap();

    // Read-only access for calculation and map-colouring code.
    window.CountyData = Object.freeze({
        years: countyIndex.years.slice(),
        byFips: countyIndex.byFips,
        get: (fips, year) => CountyDataUtils.getRecord(countyIndex, fips, year),
    });
    document.dispatchEvent(new CustomEvent("countydataloaded"));
}

loadCountyData().catch(error => {
    loadFailed = true;
    console.error(error);
    document.getElementById('map-summary').textContent = 'County data failed to load. Reload to try again.';
    metricSelect.disabled = true;
    countyHomeValue.textContent = "Data failed to load";
    countyIncome.textContent = "Data failed to load";
});
