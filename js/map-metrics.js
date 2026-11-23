(function(root) {
    const metrics = {homeValueUsd: 'Typical home value', perCapitaPersonalIncomeUsd: 'Per-capita personal income', gap: 'Home value growth minus income growth'};
    const valid = v => typeof v === 'number' && Number.isFinite(v);
    function change(a,b) { return valid(a) && valid(b) && a > 0 ? (b-a)/a*100 : null; }
    function value(a,b,metric,range) {
        if (metric === 'gap') {
            if (!range) return null;
            const home=change(a?.homeValueUsd,b?.homeValueUsd), income=change(a?.perCapitaPersonalIncomeUsd,b?.perCapitaPersonalIncomeUsd);
            return home === null || income === null ? null : home-income;
        }
        return range ? change(a?.[metric],b?.[metric]) : valid(b?.[metric]) ? b[metric] : null;
    }
    function format(v,metric,range) {
        if (!valid(v)) return 'No data';
        return range ? `${v>0?'+':''}${v.toFixed(1)}${metric==='gap'?' percentage points':'%'}` : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
    }
    function scale(values,range) {
        const nums=values.filter(valid);
        if (!nums.length) return {min:null,max:null};
        const limit=Math.max(...nums.map(Math.abs));
        return range ? {min:-limit,max:limit} : {min:Math.min(...nums),max:Math.max(...nums)};
    }
    function color(v,bounds,range) {
        if (!valid(v) || bounds.min===null) return '#b1b1b1';
        const f=bounds.max===bounds.min?0.5:(v-bounds.min)/(bounds.max-bounds.min);
        return range ? v===0?'#f7f7f7':`hsl(${v<0?215:25},70%,${95-Math.abs(f-0.5)*100}%)` : `hsl(210,65%,${92-f*62}%)`;
    }
    const api={metrics,change,value,format,scale,color};
    if(typeof module!=='undefined' && module.exports) module.exports=api; else root.MapMetrics=api;
})(typeof window!=='undefined'?window:globalThis);
