const KEY = "moneysync.transactions.v1", THEME = "moneysync.theme.v1";
let rows = load();
let isAnalysisOpen = false;

const CATEGORIES = {
  expense: [
    '🍚 อาหาร', '🚗 เดินทาง', '🛒 ของใช้',
    '🎬 ความบันเทิง', '📚 การเรียน', '💳 บิล/อินเทอร์เน็ต', 
    '🛍️ ช้อปปิ้ง', '🏥 สุขภาพ/ยา', '🎁 อื่น ๆ'
  ],
  income: [
    '💼 เงินเดือน ', 
    '📈 ดอกเบี้ย / ปันผล / ลงทุน', 
    '🏷️ ขายของ / รายได้เสริม', 
    '💵 อื่น ๆ'
  ]
};

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(n) || 0);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]") } catch { return [] } }
function save() { localStorage.setItem(KEY, JSON.stringify(rows)) }
function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function formatDate(value) {
  const [y,m,d] = String(value || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : value || "";
}

function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark");
    if ($("themeBtn")) $("themeBtn").textContent = "☀️ เปลี่ยนเป็นธีมสว่าง";
  } else {
    document.body.classList.remove("dark");
    if ($("themeBtn")) $("themeBtn").textContent = "☾ เปลี่ยนเป็นธีมมืด";
  }
  render();
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME);
  const isDark = savedTheme === "dark";
  applyTheme(isDark);
}

function updateCategoryDropdown() {
  const typeEl = document.querySelector('input[name="type"]:checked');
  if (!typeEl) return;
  const type = typeEl.value;
  const catSelect = $("category");
  if (!catSelect) return;
  catSelect.innerHTML = CATEGORIES[type].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
}

function updateFilterDropdown() {
  const filterSelect = $("categoryFilter");
  if (!filterSelect) return;
  const currentVal = filterSelect.value || "all";
  const allCats = [...CATEGORIES.expense, ...CATEGORIES.income];
  filterSelect.innerHTML = `<option value="all">แสดงทุกหมวดหมู่</option>` + allCats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  filterSelect.value = currentVal;
}

function render() {
  const mk = monthKey(), cur = rows.filter(r => r.date.slice(0, 7) === mk);
  const inc = cur.filter(r => r.type === "income").reduce((a, r) => a + Number(r.amount), 0);
  const exp = cur.filter(r => r.type === "expense").reduce((a, r) => a + Number(r.amount), 0);
  const ai = rows.filter(r => r.type === "income").reduce((a, r) => a + Number(r.amount), 0);
  const ae = rows.filter(r => r.type === "expense").reduce((a, r) => a + Number(r.amount), 0);

  $("balance").textContent = money(ai - ae);
  $("income").textContent = money(inc);
  $("expense").textContent = money(exp);

  const q = $("search").value.trim().toLowerCase();
  const selectedCat = $("categoryFilter") ? $("categoryFilter").value : "all";

  const shown = rows.filter(r => {
    const matchSearch = [r.title, r.category, r.note].some(v => String(v || "").toLowerCase().includes(q));
    const matchCat = selectedCat === "all" || r.category === selectedCat;
    return matchSearch && matchCat;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  $("transactions").innerHTML = shown.length ? shown.map(txHtml).join("") : `<p class="muted">ยังไม่มีรายการบันทึก</p>`;

  const cats = {};
  cur.filter(r => r.type === "expense").forEach(r => cats[r.category] = (cats[r.category] || 0) + Number(r.amount));
  $("categories").innerHTML = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="category-row"><span>${esc(k)}</span><strong>${money(v)}</strong></div>`).join("") || `<p class="muted">ยังไม่มีรายจ่ายเดือนนี้</p>`;

  draw("chart", inc, exp);

  if (isAnalysisOpen) {
    calculateAndRenderAnalysis();
  }
}

function calculateAndRenderAnalysis() {
  const el = $("monthlyAnalysis");
  if (!el) return;

  const now = new Date();
  const thisMK = monthKey(now);
  const lastMK = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const current = rows.filter(r => r.date.slice(0, 7) === thisMK);
  const previous = rows.filter(r => r.date.slice(0, 7) === lastMK);

  const sum = list => ({
    income: list.filter(r => r.type === "income").reduce((a,r) => a + Number(r.amount || 0), 0),
    expense: list.filter(r => r.type === "expense").reduce((a,r) => a + Number(r.amount || 0), 0)
  });
  const cur = sum(current), prev = sum(previous);
  const saving = cur.income - cur.expense;
  const savingPct = cur.income ? Math.max(0, Math.min(100, saving / cur.income * 100)) : 0;
  const change = prev.expense ? ((cur.expense - prev.expense) / prev.expense) * 100 : null;

  const cats = {};
  current.filter(r => r.type === "expense").forEach(r => {
    cats[r.category] = (cats[r.category] || 0) + Number(r.amount || 0);
  });
  const top = Object.entries(cats).sort((a,b) => b[1] - a[1])[0];
  const topPct = top && cur.expense ? Math.round(top[1] / cur.expense * 100) : 0;

  const changeClass = change === null ? "neutral" : change > 0 ? "bad" : change < 0 ? "good" : "neutral";
  const changeText = change === null ? "ยังไม่มีเดือนก่อนหน้า"
    : change > 0 ? `รายจ่ายเพิ่ม ${Math.abs(change).toFixed(1)}%`
    : change < 0 ? `รายจ่ายลด ${Math.abs(change).toFixed(1)}%`
    : "รายจ่ายเท่าเดิม";

  el.innerHTML = `
    <div class="analysis-grid">
      <div class="analysis-card">
        <div class="ring" style="--p:${savingPct * 3.6}deg"><div><b>${Math.round(savingPct)}%</b><span>เงินเหลือ</span></div></div>
        <div><strong>อัตราเงินเหลือ</strong><small>${money(Math.max(0,saving))} จากรายรับเดือนนี้</small></div>
      </div>
      <div class="analysis-card">
        <div class="ring ${changeClass}" style="--p:${Math.min(Math.abs(change || 0),100) * 3.6}deg"><div><b>${change === null ? "—" : Math.abs(change).toFixed(0)+"%"}</b><span>เทียบเดือนก่อน</span></div></div>
        <div><strong class="${changeClass}">${changeText}</strong><small>เดือนก่อน ${money(prev.expense)} · เดือนนี้ ${money(cur.expense)}</small></div>
      </div>
      <div class="analysis-card">
        <div class="ring accent" style="--p:${topPct * 3.6}deg"><div><b>${topPct}%</b><span>ของรายจ่าย</span></div></div>
        <div><strong>หมวดใช้จ่ายสูงสุด</strong><small>${top ? `${esc(top[0])} · ${money(top[1])}` : "ยังไม่มีข้อมูล"}</small></div>
      </div>
    </div>`;
}

function txHtml(r) {
  return `<div class="transaction" tabindex="0">
    <div class="tx-icon">${r.type === "income" ? "🟢" : "🔴"}</div>
    <div style="flex:1;">
      <div class="tx-title">${esc(r.title)}</div>
      <div class="tx-meta">${esc(r.category)} • ${formatDate(r.date)}${r.note ? ` • ${esc(r.note)}` : ""}</div>
    </div>
    <div class="tx-amount ${r.type}">${r.type === "income" ? "+" : "−"}${money(r.amount)}</div>
    <button class="delete" onclick="delTx('${r.id}')" title="ลบรายการ">🗑️ ลบ</button>
  </div>`;
}

window.delTx = function(id) {
  const item = rows.find(r => String(r.id) === String(id));
  if (!item) return;
  if (!confirm(`ยืนยันการลบรายการ "${item.title}" จำนวน ${money(item.amount)} ใช่หรือไม่?`)) return;
  rows = rows.filter(r => String(r.id) !== String(id));
  save();
  render();
  toast("ลบรายการเรียบร้อยแล้ว");
};

function draw(id, inc, exp) {
  const c = $(id);
  if (!c) return;
  const ctx = c.getContext("2d"), dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
  const max = Math.max(inc, exp, 1), base = h - 30, bw = Math.min(80, w / 4), gap = 30;
  
  const mutedColor = getComputedStyle(document.body).getPropertyValue("--muted").trim() || "#888";
  const textColor = getComputedStyle(document.body).getPropertyValue("--text").trim() || "#000";

  [[inc, "รายรับ", "#10b981"], [exp, "รายจ่าย", "#ef4444"]].forEach((x, i) => {
    const bh = x[0] / max * (h - 65), xp = w / 2 - bw - gap / 2 + i * (bw + gap);
    ctx.fillStyle = x[2]; ctx.fillRect(xp, base - bh, bw, bh);
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "center"; ctx.font = "500 13px 'Prompt', sans-serif"; ctx.fillText(x[1], xp + bw / 2, h - 8);
    ctx.fillStyle = textColor;
    ctx.font = "600 13px 'Prompt', sans-serif"; ctx.fillText(money(x[0]), xp + bw / 2, Math.max(18, base - bh - 6));
  });
}

function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2000); }

document.addEventListener("DOMContentLoaded", () => {
  $("date").valueAsDate = new Date();
  
  initTheme();
  updateCategoryDropdown();
  updateFilterDropdown();
  render();

  $("themeBtn").addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark");
    localStorage.setItem(THEME, isDark ? "dark" : "light");
    applyTheme(isDark);
  });

  $("toggleAnalysisBtn").addEventListener("click", () => {
    isAnalysisOpen = !isAnalysisOpen;
    const analysisEl = $("monthlyAnalysis");
    if (isAnalysisOpen) {
      analysisEl.classList.remove("hidden");
      calculateAndRenderAnalysis();
      $("toggleAnalysisBtn").textContent = "❌ ซ่อนการวิเคราะห์";
    } else {
      analysisEl.classList.add("hidden");
      $("toggleAnalysisBtn").textContent = "📊 ดูการวิเคราะห์ใช้จ่าย";
    }
  });

  document.querySelectorAll('input[name="type"]').forEach(radio => {
    radio.addEventListener("change", updateCategoryDropdown);
  });

  $("search").addEventListener("input", render);
  $("categoryFilter").addEventListener("change", render);

  $("form").addEventListener("submit", e => {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    rows.push({
      id: crypto.randomUUID(),
      type,
      amount: Number($("amount").value),
      title: $("title").value.trim(),
      category: $("category").value,
      date: $("date").value,
      note: $("note").value.trim(),
      createdAt: Date.now()
    });
    save();
    e.target.reset();
    $("date").valueAsDate = new Date();
    updateCategoryDropdown();
    render();
    toast("บันทึกรายการสำเร็จ ✓");
  });

  // ระบบส่งออกการ์ดสรุปยอดเป็นรูปภาพ PNG
  $("exportImgBtn").addEventListener("click", () => {
    toast("กำลังสร้างรูปภาพ...");
    const target = $("summaryCardContainer");
    
    if (typeof html2canvas !== "undefined") {
      html2canvas(target, {
        scale: 2,
        backgroundColor: getComputedStyle(document.body).getPropertyValue("--bg")
      }).then(canvas => {
        const link = document.createElement("a");
        link.download = `moneysync-summary-${monthKey()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast("ดาวน์โหลดรูปภาพเรียบร้อย ✓");
      }).catch(err => {
        console.error(err);
        toast("สร้างรูปภาพไม่สำเร็จ");
      });
    } else {
      toast("ไม่พบไลบรารีสร้างรูปภาพ");
    }
  });

  $("shareBtn").addEventListener("click", () => { const u = buildShare(); $("shareUrl").value = u; $("shareResult").classList.remove("hidden"); toast("สร้างลิงก์แล้ว ✓") });
  $("copyBtn").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("shareUrl").value); toast("คัดลอกแล้ว ✓") } catch { $("shareUrl").select(); document.execCommand("copy"); toast("คัดลอกแล้ว ✓") } });
  $("openShareBtn").addEventListener("click", () => location.href = $("shareUrl").value);
});

function encodeShare(obj) { const bytes = new TextEncoder().encode(JSON.stringify(obj)); let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") }
function buildShare() {
  const range = $("shareRange").value, notes = $("shareNotes").value === "yes", data = range === "month" ? rows.filter(r => r.date.slice(0, 7) === monthKey()) : rows;
  const payload = { v: 1, createdAt: new Date().toISOString(), range, notes, transactions: data.map(r => notes ? r : { ...r, note: "" }) };
  return location.origin + location.pathname.replace(/\/[^/]*$/, "/") + "share.html#" + encodeShare(payload);
}