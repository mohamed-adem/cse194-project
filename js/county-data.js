// Pure helpers for working with data/county-data.json.
// Loaded in the browser with a plain <script> tag (exposes window.CountyDataUtils)
// and in Jest via require().
(function (root) {
    function buildIndex(data) {
        if (!data || !data.counties || !data.metadata) {
            throw new Error("County data is missing 'counties' or 'metadata'");
        }
        const byFips = {};
        const bySvgId = {};
        for (const [fips, county] of Object.entries(data.counties)) {
            const entry = { fips, name: county.name, svgId: county.svgId, years: county.years };
            byFips[fips] = entry;
            bySvgId[county.svgId] = entry;
        }
        const years = data.metadata.years.slice().sort((a, b) => a - b);
        return { byFips, bySvgId, years, metadata: data.metadata };
    }

    // Returns {homeValueUsd, perCapitaPersonalIncomeUsd} for a county/year, or null
    // if the county or year is unknown. Individual values may still be null (no data).
    function getRecord(index, fips, year) {
        const county = index.byFips[fips];
        if (!county) return null;
        const record = county.years[String(year)];
        if (!record) return null;
        return {
            homeValueUsd: record.homeValueUsd,
            perCapitaPersonalIncomeUsd: record.perCapitaPersonalIncomeUsd,
        };
    }

    function formatUsd(value) {
        if (value === null || value === undefined || !Number.isFinite(value)) return "No data";
        return "$" + Math.round(value).toLocaleString("en-US");
    }

    const api = { buildIndex, getRecord, formatUsd };
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    } else {
        root.CountyDataUtils = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
