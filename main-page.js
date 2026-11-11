const countySelect = document.getElementById("county-select");


const countyPaths = document.querySelectorAll("#svg-holder svg path[id]");


const counties = Array.from(countyPaths).map(path => ({
    name: path.id
}));

counties.sort((a, b) => a.name.localeCompare(b.name));

counties.forEach(county => {
    const option = document.createElement("option");

    option.value = county.name;
    option.textContent = county.name;

    countySelect.appendChild(option);
});


const previewSVG = document.getElementById("county-preview-svg");
const countyName = document.getElementById("county-name");
const countyYear = document.getElementById("county-year");
const countyHomeValue = document.getElementById("county-home-value");
const countyIncome = document.getElementById("county-income");

// Loaded county data (see js/county-data.js). Null until the fetch completes.
let countyIndex = null;
let currentYear = null;

function showCountyValues(path) {
    if (!countyIndex) {
        countyHomeValue.textContent = "Loading…";
        countyIncome.textContent = "Loading…";
        return;
    }
    const record = CountyDataUtils.getRecord(countyIndex, path.dataset.fips, currentYear);
    countyYear.textContent = currentYear;
    countyHomeValue.textContent = CountyDataUtils.formatUsd(record && record.homeValueUsd);
    countyIncome.textContent = CountyDataUtils.formatUsd(record && record.perCapitaPersonalIncomeUsd);
}

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
    countyCopy.style.fill = "grey";

    previewSVG.appendChild(countyCopy);

    showCountyValues(path);
}

countyPaths.forEach(path => {
    path.addEventListener("mouseenter", () => showCountyPreview(path));
});


async function loadCountyData() {
    const response = await fetch("data/county-data.json");
    if (!response.ok) {
        throw new Error(`Failed to load county data: HTTP ${response.status}`);
    }
    countyIndex = CountyDataUtils.buildIndex(await response.json());
    currentYear = countyIndex.years[countyIndex.years.length - 1];

    countyPaths.forEach(path => {
        const county = countyIndex.bySvgId[path.id];
        if (county) {
            path.dataset.fips = county.fips;
        } else {
            console.warn(`Map county "${path.id}" has no matching entry in county-data.json`);
        }
    });

    // Read-only access for calculation and map-colouring code.
    window.CountyData = Object.freeze({
        years: countyIndex.years.slice(),
        byFips: countyIndex.byFips,
        get: (fips, year) => CountyDataUtils.getRecord(countyIndex, fips, year),
    });
    document.dispatchEvent(new CustomEvent("countydataloaded"));
}

loadCountyData().catch(error => {
    console.error(error);
    countyHomeValue.textContent = "Data failed to load";
    countyIncome.textContent = "Data failed to load";
});
