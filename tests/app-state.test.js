const { createAppState } = require('../js/app-state.js');

describe('createAppState', () => {
  test('starts with all keys, defaulting to null', () => {
    const store = createAppState({ mode: 'single' });
    expect(store.get()).toEqual({ county: null, mode: 'single', startYear: null, endYear: null });
  });

  test('update merges and notifies with the changed keys', () => {
    const calls = [];
    const store = createAppState({}, (state, changed) => calls.push([state, changed]));
    store.update({ county: '06073', startYear: 2024 });
    expect(store.get()).toEqual({ county: '06073', mode: null, startYear: 2024, endYear: null });
    expect(calls).toHaveLength(1);
    expect(calls[0][1].sort()).toEqual(['county', 'startYear']);
  });

  test('no-op updates do not notify', () => {
    const onChange = jest.fn();
    const store = createAppState({ county: '06073' }, onChange);
    store.update({ county: '06073' });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('only reports keys whose value actually changed', () => {
    const onChange = jest.fn();
    const store = createAppState({ mode: 'single', startYear: 2020, endYear: 2020 }, onChange);
    store.update({ mode: 'single', startYear: 2020, endYear: 2021 });
    expect(onChange).toHaveBeenCalledWith(expect.any(Object), ['endYear']);
  });

  test('state objects are frozen so listeners cannot mutate them', () => {
    const store = createAppState({});
    expect(Object.isFrozen(store.get())).toBe(true);
  });

  test('rejects unknown keys', () => {
    const store = createAppState({});
    expect(() => store.update({ colour: 'red' })).toThrow(/Unknown app state key/);
  });
});
