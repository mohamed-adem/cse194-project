// A tiny state container for the main page's user selection.
// Loaded in the browser with a plain <script> tag (exposes window.AppStateUtils)
// and in Jest via require().
(function (root) {
    const KEYS = ["county", "mode", "startYear", "endYear"];

    // onChange(newState, changedKeys) is called after every update that changes something.
    function createAppState(initial, onChange) {
        let state = Object.freeze(pick(initial));

        function pick(source) {
            const result = {};
            for (const key of KEYS) result[key] = source && source[key] !== undefined ? source[key] : null;
            return result;
        }

        return {
            get() {
                return state;
            },
            // Merges `patch` into the state. Unknown keys throw; no-op updates are ignored.
            update(patch) {
                for (const key of Object.keys(patch)) {
                    if (!KEYS.includes(key)) throw new Error(`Unknown app state key: ${key}`);
                }
                const changed = Object.keys(patch).filter(key => patch[key] !== state[key]);
                if (changed.length === 0) return state;
                state = Object.freeze({ ...state, ...patch });
                if (onChange) onChange(state, changed);
                return state;
            },
        };
    }

    const api = { createAppState, KEYS };
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    } else {
        root.AppStateUtils = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
