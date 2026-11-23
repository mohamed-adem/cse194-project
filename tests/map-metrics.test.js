const m = require('../js/map-metrics');
const data = require('../data/county-data.json');
test('calculates endpoint growth and percentage-point gap', () => {
    const a={homeValueUsd:100,perCapitaPersonalIncomeUsd:50}, b={homeValueUsd:150,perCapitaPersonalIncomeUsd:60};
    expect(m.value(a,b,'homeValueUsd',true)).toBe(50);
    expect(m.value(a,b,'gap',true)).toBe(30);
    expect(m.value(a,b,'homeValueUsd',false)).toBe(150);
});
test('missing data and zero denominator remain unavailable', () => {
    expect(m.change(null,100)).toBeNull();
    expect(m.change(0,100)).toBeNull();
    expect(m.value(null,{homeValueUsd:100},'gap',true)).toBeNull();
    expect(m.color(null,m.scale([5],true),true)).toBe('#b1b1b1');
});
test('negative, zero and positive changes use a zero-centered scale', () => {
    expect(m.scale([-20,0,50],true)).toEqual({min:-50,max:50});
    expect(m.color(0,m.scale([0],true),true)).toBe('#f7f7f7');
    expect(m.scale([null],true)).toEqual({min:null,max:null});
    expect(m.format(30,'gap',true)).toBe('+30.0 percentage points');
});
test('real county data supports all 58 FIPS and preserves missing endpoints', () => {
    const results=Object.values(data.counties).map(c=>m.value(c.years['2000'],c.years['2024'],'homeValueUsd',true));
    expect(results).toHaveLength(58);
    expect(results.some(v=>v===null)).toBe(true);
    expect(results.filter(v=>v!==null).every(Number.isFinite)).toBe(true);
});
