// Pure validation helpers for the main page inputs.
// Loaded in the browser with a plain <script> tag (exposes window.Validation)
// and in Jest via require().
(function (root) {
    // Parses one year field. `years` is the sorted list of years that have data.
    // Returns {ok: true, value} or {ok: false, error}.
    function parseYear(raw, years) {
        const text = String(raw === undefined || raw === null ? "" : raw).trim();
        if (text === "") {
            return { ok: false, error: "Enter a year." };
        }
        if (!/^\d{4}$/.test(text)) {
            return { ok: false, error: "Enter a whole 4-digit year, like 2015." };
        }
        const value = Number(text);
        const min = years[0];
        const max = years[years.length - 1];
        if (value < min || value > max || !years.includes(value)) {
            return { ok: false, error: `Data is available from ${min} to ${max}.` };
        }
        return { ok: true, value };
    }

    // Validates the year inputs as a whole.
    // mode: "single" | "range". In single mode only `start` is used.
    // Returns {ok: true, mode, startYear, endYear} or
    //         {ok: false, errors: {start?: string, end?: string}}.
    function validateYears({ mode, start, end }, years) {
        if (mode !== "single" && mode !== "range") {
            throw new Error(`Unknown year mode: ${mode}`);
        }
        const errors = {};
        const startResult = parseYear(start, years);
        if (!startResult.ok) errors.start = startResult.error;

        if (mode === "single") {
            if (errors.start) return { ok: false, errors };
            return { ok: true, mode, startYear: startResult.value, endYear: startResult.value };
        }

        const endResult = parseYear(end, years);
        if (!endResult.ok) errors.end = endResult.error;
        if (startResult.ok && endResult.ok && startResult.value > endResult.value) {
            errors.end = "Must be the same as or after the start year.";
        }
        if (errors.start || errors.end) return { ok: false, errors };
        return { ok: true, mode, startYear: startResult.value, endYear: endResult.value };
    }

    const api = { parseYear, validateYears };
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    } else {
        root.Validation = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
