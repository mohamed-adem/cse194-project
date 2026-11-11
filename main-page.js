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
        countyHomeValue.textContent = "Loading...";
        countyIncome.textContent = "Loading...";
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

function clearCountyPreview() {
    countyName.textContent = "Hover over a county";
    previewSVG.innerHTML = "";
    countyYear.textContent = "-";
    countyHomeValue.textContent = "-";
    countyIncome.textContent = "-";
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
}

// When the pointer/focus leaves a county, fall back to the selected one.
function restoreSelectedPreview() {
    if (selectedPath) {
        showCountyPreview(selectedPath);
    } else {
        clearCountyPreview();
    }
}

countyPaths.forEach(path => {
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-pressed", "false");
    path.setAttribute("aria-label", `${path.id} County`);

    path.addEventListener("mouseenter", () => showCountyPreview(path));
    path.addEventListener("focus", () => showCountyPreview(path));
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
        if (event.key === "Enter" || event.key === " ") {
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
    currentYear = countyIndex.years[countyIndex.years.length - 1];

    countyPaths.forEach(path => {
        const county = countyIndex.bySvgId[path.id];
        if (county) {
            path.dataset.fips = county.fips;
            path.setAttribute("aria-label", `${county.name} County`);
        } else {
            console.warn(`Map county "${path.id}" has no matching entry in county-data.json`);
        }
    });
    // Refresh the panel in case a county was selected before the data arrived.
    restoreSelectedPreview();

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
