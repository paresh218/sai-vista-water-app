
(() => {
  const D = window.WATER_DATA;
  const $m = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const fmt = n => new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(n||0);
  const fmt1 = n => new Intl.NumberFormat('en-IN',{maximumFractionDigits:1}).format(n||0);
  const pct = n => `${(n*100).toFixed(1)}%`;
  const state = {month:'Sep 2026', wing:'All', category:'All'};
  const charts = {};
  const monthDays = m => D.meta.coverageDays[m] || 1;

  const monthly = (entity, month, wing='All', category='All') => D.monthly.filter(r =>
    r.entityType===entity && r.month===month &&
    (wing==='All' || r.wing===wing) && (category==='All' || r.category===category)
  );
  const sum = (arr,key) => arr.reduce((a,b)=>a+(+b[key]||0),0);
  const wingTotal = (month, wing='All', category='All') => sum(monthly('Wing',month,wing,category),'used');
  const pcmcReceived = month => sum(monthly('PCMC',month,'All','All'),'received');
  const mainRows = month => monthly('Main Tank',month,'All','All');
  const avgDay = (month, wing='All', category='All') => wingTotal(month,wing,category)/monthDays(month);
  const selectedTotal = () => wingTotal(state.month,state.wing,state.category);
  const baselineMonth = 'Aug 2026';
  const dailyChange = () => {
    const a=avgDay(baselineMonth,state.wing,state.category), b=avgDay(state.month,state.wing,state.category);
    return a ? (b/a)-1 : 0;
  };
  const savePerDay = () => avgDay(baselineMonth,state.wing,state.category)-avgDay(state.month,state.wing,state.category);

  function setKpis(){
    const total=selectedTotal(), days=monthDays(state.month), avg=total/days, change=dailyChange(), save=savePerDay();
    $m('#kpiConsumption').textContent=`${fmt(total)} L`;
    $m('#kpiConsumptionSub').textContent=`${state.month} • ${state.wing==='All'?'All wings':'Wing '+state.wing} • ${state.category}`;
    $m('#kpiDaily').textContent=`${fmt(avg)} L`;
    $m('#kpiDailySub').textContent=`Average per day across ${days} recorded day${days>1?'s':''}`;
    $m('#kpiChange').textContent=`${change>=0?'+':''}${pct(change)}`;
    $m('#kpiChangeSub').textContent= state.month==='Aug 2026' ? 'August is the comparison baseline' : 'Compared with August average/day';
    $m('#kpiChangeCard').classList.toggle('border-danger',change>0);
    $m('#kpiChangeCard').classList.toggle('border-success',change<0);
    $m('#kpiPcmc').textContent=`${fmt(pcmcReceived(state.month))} L`;
    $m('#kpiPcmcSub').textContent=`PCMC water received during ${state.month}`;
    $m('#kpiSaving').textContent=`${save>=0?fmt(save):'−'+fmt(Math.abs(save))} L/day`;
    $m('#kpiSavingSub').textContent= save>=0 ? 'Lower daily use vs August' : 'Higher daily use vs August';
  }

  function chart(id,type,data,options={}){
    if(charts[id]) charts[id].destroy();
    charts[id]=new Chart($m('#'+id),{type,data,options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fmt1(c.raw)} L`}}},
      scales:type==='doughnut'?{}:{y:{beginAtZero:true,ticks:{callback:v=>fmt(v)}}},
      ...options
    }});
  }

  function renderWingChart(){
    const wings=D.meta.wings;
    const cats=state.category==='All'?D.meta.categories:[state.category];
    const ds=cats.map((cat,i)=>({
      label:`${cat} consumption`,
      data:wings.map(w=>wingTotal(state.month,w,cat)),
      backgroundColor:['#2a9d8f','#457b9d','#f4a261'][i%3],
      borderWidth:0
    }));
    chart('wingChart','bar',{labels:wings.map(w=>'Wing '+w),datasets:ds},{
      scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{callback:v=>fmt(v)}}}
    });
  }

  function renderComparisonChart(){
    const labels=D.meta.wings.map(w=>'Wing '+w);
    chart('comparisonChart','bar',{labels,datasets:[
      {label:'August average/day',data:D.meta.wings.map(w=>avgDay('Aug 2026',w,state.category)),backgroundColor:'#457b9d'},
      {label:'September MTD average/day',data:D.meta.wings.map(w=>avgDay('Sep 2026',w,state.category)),backgroundColor:'#2a9d8f'}
    ]});
  }

  function renderTypeChart(){
    const cats=D.meta.categories;
    const values=cats.map(c=>wingTotal(state.month,state.wing,c));
    chart('typeChart','doughnut',{labels:cats,datasets:[{label:'Consumption',data:values,backgroundColor:['#2a9d8f','#457b9d','#f4a261']}]},{
      plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.label}: ${fmt(c.raw)} L (${(c.raw/values.reduce((a,b)=>a+b,0)*100||0).toFixed(1)}%)`}}}
    });
  }

  function renderDailyTrend(){
    let rows=D.daily.filter(r=>r.entityType==='Wing' && r.month===state.month &&
      (state.wing==='All'||r.wing===state.wing) && (state.category==='All'||r.category===state.category));
    const dates=[...new Set(rows.map(r=>r.date))].sort();
    const cats=state.category==='All'?D.meta.categories:[state.category];
    const colors=['#2a9d8f','#457b9d','#f4a261'];
    const ds=cats.map((cat,i)=>({
      label:`${cat} daily consumption`,
      data:dates.map(d=>sum(rows.filter(r=>r.date===d && r.category===cat),'used')),
      borderColor:colors[i],backgroundColor:colors[i],tension:.2,pointRadius:2
    }));
    chart('trendChart','line',{labels:dates.map(x=>new Date(x+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})),datasets:ds},{
      interaction:{mode:'index',intersect:false}
    });
  }

  function renderMainTank(){
    const cats=D.meta.categories;
    const rows=mainRows(state.month);
    chart('tankChart','bar',{labels:cats,datasets:[
      {label:'Main tank water received',data:cats.map(c=>sum(rows.filter(r=>r.category===c),'received')),backgroundColor:'#457b9d'},
      {label:'Main tank water used / outflow',data:cats.map(c=>sum(rows.filter(r=>r.category===c),'used')),backgroundColor:'#f4a261'}
    ]});
  }

  function renderPcmcChart(){
    const months=['Aug 2026','Sep 2026'];
    chart('pcmcChart','bar',{labels:months,datasets:[
      {label:'PCMC water received',data:months.map(m=>pcmcReceived(m)),backgroundColor:'#2a9d8f'},
      {label:'Total wing consumption',data:months.map(m=>wingTotal(m)),backgroundColor:'#457b9d'}
    ]});
  }

  function wingRow(w){
    const a=wingTotal('Aug 2026',w,state.category), s=wingTotal('Sep 2026',w,state.category);
    const aa=a/monthDays('Aug 2026'), ss=s/monthDays('Sep 2026'), ch=aa?(ss/aa-1):0;
    const vals = {};
    D.meta.categories.forEach(c=>{vals[c]=wingTotal(state.month,w,c)});
    return {w,a,s,aa,ss,ch,save:aa-ss,selected:wingTotal(state.month,w,state.category),vals};
  }

  function renderWingTable(){
    const body=$m('#wingTableBody'); body.innerHTML='';
    D.meta.wings.forEach(w=>{
      const r=wingRow(w); const cls=r.ch<0?'badge-good':r.ch>0?'badge-bad':'badge-neutral';
      body.insertAdjacentHTML('beforeend',`<tr>
        <td class="fw-bold">Wing ${w}</td>
        <td>${fmt(r.vals.Domestic)}</td><td>${fmt(r.vals.Drinking)}</td><td>${fmt(r.vals.Flushing)}</td>
        <td class="fw-bold">${fmt(r.selected)}</td><td>${fmt(r.aa)}</td><td>${fmt(r.ss)}</td>
        <td><span class="badge ${cls}">${r.ch>=0?'+':''}${pct(r.ch)}</span></td>
        <td>${r.save>=0?fmt(r.save):'−'+fmt(Math.abs(r.save))}</td>
      </tr>`);
    });
  }

  function renderTankTable(){
    const body=$m('#tankTableBody'); body.innerHTML='';
    const rows=mainRows(state.month);
    D.meta.categories.forEach(c=>{
      const r=rows.find(x=>x.category===c)||{};
      body.insertAdjacentHTML('beforeend',`<tr><td>Main ${c} Tank</td><td>${fmt(r.received||0)}</td><td>${fmt(r.used||0)}</td>
        <td>${r.avgPercentFull==null?'—':fmt1(r.avgPercentFull)+'%'}</td>
        <td>${r.minPercentFull==null?'—':fmt1(r.minPercentFull)+'%'}</td>
        <td>${r.maxPercentFull==null?'—':fmt1(r.maxPercentFull)+'%'}</td></tr>`);
    });
    body.insertAdjacentHTML('beforeend',`<tr class="table-info"><td class="fw-bold">PCMC Inlet</td><td class="fw-bold">${fmt(pcmcReceived(state.month))}</td><td>—</td><td colspan="3">Municipal water received as recorded by inlet sensor</td></tr>`);
  }

  function renderInsights(){
    const rows=D.meta.wings.map(wingRow);
    const highest=[...rows].sort((a,b)=>b.selected-a.selected)[0];
    const lowest=[...rows].sort((a,b)=>a.selected-b.selected)[0];
    const best=[...rows].sort((a,b)=>a.ch-b.ch)[0];
    const worst=[...rows].sort((a,b)=>b.ch-a.ch)[0];
    const catTotals=D.meta.categories.map(c=>({c,v:wingTotal(state.month,'All',c)})).sort((a,b)=>b.v-a.v);
    const holder=$m('#insights'); holder.innerHTML='';
    [
      [`Highest consumption`, `Wing ${highest.w} has the highest selected-period consumption at ${fmt(highest.selected)} L.`],
      [`Lowest consumption`, `Wing ${lowest.w} has the lowest selected-period consumption at ${fmt(lowest.selected)} L.`],
      [`Best daily improvement`, `Wing ${best.w} changed by ${pct(best.ch)} in average daily use versus August.`],
      [`Largest daily increase`, `Wing ${worst.w} changed by ${pct(worst.ch)} in average daily use versus August.`],
      [`Largest water category`, `${catTotals[0].c} is the largest consumption category for ${state.month} at ${fmt(catTotals[0].v)} L.`]
    ].forEach(([h,t])=>holder.insertAdjacentHTML('beforeend',`<div class="insight-item mb-2"><div class="fw-semibold">${h}</div><div class="small-muted">${t}</div></div>`));
  }

  function renderHeader(){
    $m('#reportPeriod').textContent=`Showing ${state.month} • ${state.wing==='All'?'All wings':'Wing '+state.wing} • ${state.category==='All'?'All water types':state.category}`;
    $m('#coverageText').textContent=`Data coverage: ${monthDays(state.month)} recorded days. Latest source date: ${new Date(D.meta.snapshotDate+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}.`;
  }

  function renderAll(){renderHeader();setKpis();renderWingChart();renderComparisonChart();renderTypeChart();renderDailyTrend();renderMainTank();renderPcmcChart();renderWingTable();renderTankTable();renderInsights();}

  function exportCsv(){
    const header=['Wing','Domestic (L)','Drinking (L)','Flushing (L)','Selected Total (L)','Aug Avg/Day (L)','Sep Avg/Day (L)','Daily Change %','Daily Saving/Excess (L)'];
    const lines=[header];
    D.meta.wings.forEach(w=>{
      const r=wingRow(w);
      lines.push([`Wing ${w}`,r.vals.Domestic,r.vals.Drinking,r.vals.Flushing,r.selected,r.aa,r.ss,(r.ch*100).toFixed(2),r.save]);
    });
    const csv=lines.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`sai-vista-water-${state.month.replace(' ','-')}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const monthSel=$m('#monthFilter'),wingSel=$m('#wingFilter'),catSel=$m('#categoryFilter');
    D.meta.months.forEach(x=>monthSel.insertAdjacentHTML('beforeend',`<option ${x===state.month?'selected':''}>${x}</option>`));
    D.meta.wings.forEach(x=>wingSel.insertAdjacentHTML('beforeend',`<option value="${x}">Wing ${x}</option>`));
    D.meta.categories.forEach(x=>catSel.insertAdjacentHTML('beforeend',`<option>${x}</option>`));
    [monthSel,wingSel,catSel].forEach(el=>el.addEventListener('change',()=>{
      state.month=monthSel.value; state.wing=wingSel.value; state.category=catSel.value; renderAll();
    }));
    $m('#resetFilters').addEventListener('click',()=>{state.month='Sep 2026';state.wing='All';state.category='All';monthSel.value=state.month;wingSel.value='All';catSel.value='All';renderAll();});
    $m('#exportCsv').addEventListener('click',exportCsv);
    $m('#printReport').addEventListener('click',()=>window.print());
    renderAll();
  });
})();
