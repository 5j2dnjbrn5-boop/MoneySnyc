const KEY="moneysync.transactions.v1";const $=id=>document.getElementById(id);const money=n=>new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(Number(n)||0);const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function decodeShare(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const bin=atob(s);const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}
function fmtDate(v){const [y,m,d]=String(v||"").split("-");return y&&m&&d?`${d}/${m}/${y}`:v||""}\nfunction txHtml(r){return `<div class="transaction"><div class="tx-icon ${r.type==="income"?"income":"expense"}">${r.type==="income"?"↗":"↘"}</div><div><div class="tx-title">${esc(r.title)}</div><div class="tx-meta">${esc(r.category)} • ${esc(r.date)}${r.note?` • ${esc(r.note)}`:""}</div></div><div class="tx-amount ${r.type}">${r.type==="income"?"+":"−"}${money(r.amount)}</div></div>`}
function draw(inc,exp){
  const c=$("chart"); if(!c)return;
  const ctx=c.getContext("2d"),dpr=devicePixelRatio||1,w=Math.max(c.clientWidth,240),h=Math.max(c.clientHeight,210);
  c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const styles=getComputedStyle(document.body),text=styles.getPropertyValue("--text").trim()||"#172033",muted=styles.getPropertyValue("--muted").trim()||"#7a8495",line=styles.getPropertyValue("--line").trim()||"#e7eaf0";
  const total=inc+exp,cx=w/2,cy=h/2-8,r=Math.min(72,w*.22);
  ctx.lineWidth=20;ctx.lineCap="round";ctx.beginPath();ctx.strokeStyle=line;ctx.arc(cx,cy,r,-Math.PI/2,Math.PI*1.5);ctx.stroke();
  if(total){const a=inc/total*Math.PI*2;ctx.beginPath();ctx.strokeStyle="#22c55e";ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+a);ctx.stroke();ctx.beginPath();ctx.strokeStyle="#ef4444";ctx.arc(cx,cy,r,-Math.PI/2+a,-Math.PI/2+Math.PI*2);ctx.stroke();}
  ctx.textAlign="center";ctx.fillStyle=text;ctx.font="700 17px sans-serif";ctx.fillText(total?`${Math.round(exp/total*100)}%`:"0%",cx,cy+2);ctx.fillStyle=muted;ctx.font="12px sans-serif";ctx.fillText("รายจ่าย",cx,cy+22);
  ctx.textAlign="left";ctx.fillStyle="#22c55e";ctx.fillText("● รายรับ",cx-105,h-25);ctx.fillStyle="#ef4444";ctx.fillText("● รายจ่าย",cx+25,h-25);
}
let payload=null;try{payload=decodeShare(location.hash.slice(1))}catch{}
if(!payload||payload.v!==1||!Array.isArray(payload.transactions)){$("invalid").classList.remove("hidden")}else{
 $("content").classList.remove("hidden");$("period").textContent=payload.range==="month"?"Snapshot: เดือนที่สร้างลิงก์":"Snapshot: ข้อมูลทั้งหมด";
 const rows=payload.transactions,inc=rows.filter(r=>r.type==="income").reduce((a,r)=>a+Number(r.amount),0),exp=rows.filter(r=>r.type==="expense").reduce((a,r)=>a+Number(r.amount),0);
 $("balance").textContent=money(inc-exp);$("income").textContent=money(inc);$("expense").textContent=money(exp);
 $("transactions").innerHTML=rows.sort((a,b)=>b.date.localeCompare(a.date)).map(txHtml).join("")||`<p class="muted">ไม่มีรายการ</p>`;
 const cats={};rows.filter(r=>r.type==="expense").forEach(r=>cats[r.category]=(cats[r.category]||0)+Number(r.amount));
 $("categories").innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="category-row"><span>${esc(k)}</span><strong>${money(v)}</strong></div>`).join("")||`<p class="muted">ไม่มีรายจ่าย</p>`;
 draw(inc,exp);
 $("importBtn").addEventListener("click",()=>{try{const old=JSON.parse(localStorage.getItem(KEY)||"[]");localStorage.setItem(KEY,JSON.stringify(old.concat(rows.map(r=>({...r,id:crypto.randomUUID(),createdAt:Date.now()})))));toast("นำข้อมูลเข้าเครื่องแล้ว ✓")}catch{toast("นำเข้าไม่สำเร็จ")}});
}