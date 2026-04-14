import{p,a,r as u,l as m,U as v,g as r,b as h}from"./progression-DD3UMJdn.js";const f=110;p();const g=document.querySelector("#diamond-bank"),l=document.querySelector("#upgrade-shop"),S=document.querySelector("#reset-progress");function n(){const o=m();g.textContent=`${o.diamonds}`,l.innerHTML=Object.entries(v).map(([e,t])=>{const s=o.upgrades[e],c=s>=t.maxLevel?"MAX":`${r(e,s)} D`,d=Array.from({length:t.maxLevel},(b,i)=>`<span class="shop-level${i<s?" is-filled":""}"></span>`).join("");return`
      <div class="shop-row">
        <div class="shop-name">${t.label}</div>
        <div class="shop-levels">${d}</div>
        <button class="shop-buy" data-upgrade="${e}" ${s>=t.maxLevel||o.diamonds<r(e,s)?"disabled":""}>${c}</button>
      </div>
    `}).join("");for(const e of l.querySelectorAll(".shop-buy"))e.addEventListener("click",async()=>{await a(),h(e.dataset.upgrade),n()})}S.addEventListener("click",async()=>{await a(),u(),n()});n();for(const o of document.querySelectorAll(".link"))o.addEventListener("click",async e=>{e.preventDefault(),await a(),window.setTimeout(()=>{window.location.href=o.href},f)});
