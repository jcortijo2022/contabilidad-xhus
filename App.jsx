import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://adnyrevdvdndffesaszc.supabase.co";
const SUPABASE_KEY = "sb_publishable_GsfPHYgw6xMjM3LISfz4Gg_KuEvwP_x";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth });
  useEffect(() => {
    const h = () => setSize({ w: window.innerWidth });
    window.addEventListener("resize", h);
    window.addEventListener("orientationchange", h);
    return () => { window.removeEventListener("resize", h); window.removeEventListener("orientationchange", h); };
  }, []);
  return size;
}

const CATEGORIES = {
  ingreso: ["Alquiler","Bizum","Gastos mes","Nómina","Transferencia","Traspaso"],
  gasto: ["Agua","Alarma","Amazon","Bizum","Casa","Coche","Comunidad","Compras","Gasolina","Luz","Médicos sin Fronteras","Mutualidad","Préstamo","Recibos","Restaurantes","Seguro","Transferencia","Traspaso","Varios"],
};
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const ACCOUNT_COLORS = ["#4f46e5","#059669","#d97706","#dc2626","#7c3aed","#0284c7"];
const ACCOUNT_ICONS  = ["🏦","💳","💵","📈","🪙","🏠"];
const ACCOUNT_TYPES  = ["cuenta","deposito","bolsa"];
const ACCOUNT_TYPE_LABELS = { cuenta:"Cuentas", deposito:"Depósitos", bolsa:"Bolsa" };
const ACCOUNT_TYPE_COLORS = { cuenta:"#4f46e5", deposito:"#059669", bolsa:"#d97706" };
const RECURRENCE_OPTIONS = [
  { value:"none", label:"Sin recurrencia" },
  { value:"monthly", label:"Mensual" },
  { value:"quarterly", label:"Trimestral" },
  { value:"yearly", label:"Anual" },
];
const today = () => new Date().toISOString().split("T")[0];
const fmx = n => new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(n);
const recLabel = {monthly:"Mensual", quarterly:"Trimestral", yearly:"Anual"};
const capFirst = s => s.replace(/^\w/, c => c.toUpperCase());

function getNextDate(dateStr, recurrence) {
  const [y, m, d] = dateStr.split("-").map(Number);
  let ny = y, nm = m, nd = d;
  if(recurrence === "monthly")   { nm += 1; if(nm > 12) { nm = 1; ny += 1; } }
  if(recurrence === "quarterly") { nm += 3; if(nm > 12) { nm -= 12; ny += 1; } }
  if(recurrence === "yearly")    { ny += 1; }
  return `${ny}-${String(nm).padStart(2,"0")}-${String(nd).padStart(2,"0")}`;
}

function daysUntil(dateStr) {
  if(!dateStr) return null;
  const diff = new Date(dateStr + "T00:00:00") - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const AV_KEY = "131AQO2BJ8QA7BEX";
async function fetchStockPrice(ticker) {
  try {
    let stooqTicker = ticker;
    if(!ticker.includes(".") && !ticker.startsWith("^") && !ticker.endsWith("=F")) {
      stooqTicker = ticker + ".US";
    }
    const url = `https://stooq.com/q/l/?s=${stooqTicker.toLowerCase()}&f=sd2t2ohlcv&h&e=csv`;
    const proxy = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const text = await res.text();
    const lines = text.trim().split("\n");
    if(lines.length >= 2) {
      const cols = lines[1].split(",");
      const price = parseFloat(cols[4]);
      if(!isNaN(price) && cols[1] !== "N/D") return price;
    }
  } catch(e) {}
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const price = parseFloat(data?.["Global Quote"]?.["05. price"]);
    if(!isNaN(price)) return price;
  } catch(e) {}
  return null;
}

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0);
  if (total === 0) return <p style={{color:"#94a3b8",fontSize:14,textAlign:"center"}}>Sin datos</p>;
  let cumulative = 0;
  const slices = data.map(d => { const pct = Math.max(d.value, 0) / total; const start = cumulative; cumulative += pct; return { ...d, pct, start }; });
  const size = 140, cx = size/2, cy = size/2, r = 52, inner = 30;
  function polarToXY(pct) { const a = pct*2*Math.PI-Math.PI/2; return [cx+r*Math.cos(a),cy+r*Math.sin(a)]; }
  function innerXY(pct) { const a = pct*2*Math.PI-Math.PI/2; return [cx+inner*Math.cos(a),cy+inner*Math.sin(a)]; }
  return (
    <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
      <svg width={size} height={size}>
        {slices.map((s,i) => {
          if(s.pct<0.001) return null;
          const [x1,y1]=polarToXY(s.start); const [x2,y2]=polarToXY(s.start+s.pct);
          const [ix1,iy1]=innerXY(s.start); const [ix2,iy2]=innerXY(s.start+s.pct);
          const large = s.pct>0.5?1:0;
          return <path key={i} d={`M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`} fill={s.color} opacity={0.9}/>;
        })}
      </svg>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {slices.map((s,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:s.color,flexShrink:0}}/>
            <div>
              <span style={{fontSize:13,color:"#475569",fontWeight:600}}>{s.label}</span>
              <span style={{fontSize:12,color:"#94a3b8",marginLeft:6}}>{(s.pct*100).toFixed(1)}%</span>
              <span style={{fontSize:13,color:"#1e293b",marginLeft:6,fontWeight:700}}>{fmx(s.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function exportCSV(transactions, accounts) {
  const accMap = Object.fromEntries(accounts.map(a=>[a.id,a.name]));
  const header = ["Fecha","Descripción","Categoría","Tipo","Importe","Cuenta","Recurrente"];
  const rows = transactions.map(t=>[t.date,t.description,t.category,t.type,t.amount.toFixed(2),accMap[t.account_id]||"",t.recurrence&&t.recurrence!=="none"?t.recurrence:"No"]);
  const csv = [header,...rows].map(r=>r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="contabilidad-xhus.csv"; a.click(); URL.revokeObjectURL(url);
}

function ExportModal({ transactions, accounts, stocks, livePrices, totals, onClose, showToast }) {
  const [exportAcc, setExportAcc] = useState("all");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const getFiltered = () => transactions
    .filter(t => exportAcc==="all" || t.account_id===exportAcc)
    .filter(t => !exportFrom || t.date >= exportFrom)
    .filter(t => !exportTo || t.date <= exportTo)
    .sort((a,b)=>b.date.localeCompare(a.date));

  const doExportCSV = () => {
    const filtered = getFiltered();
    const accMap = Object.fromEntries(accounts.map(a=>[a.id,a.name]));
    const header = ["Fecha","Descripción","Categoría","Tipo","Importe","Cuenta"];
    const rows = filtered.map(t=>[t.date,t.description,t.category,t.type,t.amount.toFixed(2),accMap[t.account_id]||""]);
    const csv = [header,...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="contabilidad-xhus.csv"; a.click(); URL.revokeObjectURL(url);
    showToast("CSV descargado ✓","#059669"); onClose();
  };

  const doExportHTML = () => {
    const filtered = getFiltered();
    const accMap = Object.fromEntries(accounts.map(a=>[a.id,a.name]));
    const ing = filtered.filter(t=>t.type==="ingreso").reduce((s,t)=>s+t.amount,0);
    const gas = filtered.filter(t=>t.type==="gasto").reduce((s,t)=>s+t.amount,0);
    const rows = filtered.map(t=>`<tr><td>${t.date}</td><td>${t.description}</td><td>${t.category}</td><td style="color:${t.type==="ingreso"?"#059669":"#dc2626"}">${t.type==="ingreso"?"Ingreso":"Gasto"}</td><td style="text-align:right;color:${t.type==="ingreso"?"#059669":"#dc2626"}">${t.type==="ingreso"?"+":"-"}${fmx(t.amount)}</td><td>${accMap[t.account_id]||""}</td></tr>`).join("");
    const accRows = accounts.map(a=>{
      const aIng=transactions.filter(t=>t.account_id===a.id&&t.type==="ingreso").reduce((s,t)=>s+t.amount,0);
      const aGas=transactions.filter(t=>t.account_id===a.id&&t.type==="gasto").reduce((s,t)=>s+t.amount,0);
      const aBal=a.balance+aIng-aGas;
      return `<tr><td>${a.icon} ${a.name}</td><td>${a.bank}</td><td style="color:#059669">${fmx(aIng)}</td><td style="color:#dc2626">${fmx(aGas)}</td><td style="font-weight:700;color:${aBal>=0?"#059669":"#dc2626"}">${fmx(aBal)}</td></tr>`;
    }).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contabilidad Xhus</title><style>body{font-family:sans-serif;padding:32px;color:#111}h1,h2{color:#4f46e5}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#4f46e5;color:white;padding:10px 12px;text-align:left}td{padding:8px 12px;border-bottom:1px solid #e5e7eb}.kpi{display:flex;gap:20px;margin:20px 0;flex-wrap:wrap}.kpi-card{padding:16px 20px;border-radius:12px;border-left:4px solid}@media print{body{padding:16px}}</style></head><body>
    <h1>◈ Contabilidad Xhus</h1><p>Generado: ${new Date().toLocaleDateString("es-ES",{dateStyle:"long"})}</p>
    <div class="kpi"><div class="kpi-card" style="background:#f0fdf4;border-color:#059669"><b>Ingresos</b><br><span style="font-size:20px;color:#059669">${fmx(ing)}</span></div><div class="kpi-card" style="background:#fef2f2;border-color:#dc2626"><b>Gastos</b><br><span style="font-size:20px;color:#dc2626">${fmx(gas)}</span></div><div class="kpi-card" style="background:#eff6ff;border-color:#4f46e5"><b>Balance</b><br><span style="font-size:20px;color:#4f46e5">${fmx(ing-gas)}</span></div></div>
    <h2>Resumen de cuentas</h2><table><thead><tr><th>Cuenta</th><th>Banco</th><th>Ingresos</th><th>Gastos</th><th>Saldo</th></tr></thead><tbody>${accRows}</tbody></table>
    <h2>Movimientos</h2><table><thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Tipo</th><th>Importe</th><th>Cuenta</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>window.print()</script></body></html>`;
    const blob=new Blob([html],{type:"text/html;charset=utf-8"}); const url=URL.createObjectURL(blob); window.open(url,"_blank");
    showToast("Reporte abierto ✓","#059669"); onClose();
  };

  const doExportSaldos = () => {
    const accRows = accounts.map(a=>{
      const aIng=transactions.filter(t=>t.account_id===a.id&&t.type==="ingreso").reduce((s,t)=>s+t.amount,0);
      const aGas=transactions.filter(t=>t.account_id===a.id&&t.type==="gasto").reduce((s,t)=>s+t.amount,0);
      const aBal=a.balance+aIng-aGas;
      const typeLabel={cuenta:"Cuenta",deposito:"Depósito",bolsa:"Bolsa"}[a.type||"cuenta"];
      return `<tr><td style="font-size:18px">${a.icon}</td><td><b>${a.name}</b><br><span style="color:#94a3b8;font-size:12px">${a.bank} · ${typeLabel}</span></td><td style="color:#059669">${fmx(aIng)}</td><td style="color:#dc2626">${fmx(aGas)}</td><td style="font-size:16px;font-weight:700;color:${aBal>=0?"#059669":"#dc2626"}">${fmx(aBal)}</td></tr>`;
    }).join("");
    const totalBal=accounts.reduce((s,a)=>{const aIng=transactions.filter(t=>t.account_id===a.id&&t.type==="ingreso").reduce((ss,t)=>ss+t.amount,0); const aGas=transactions.filter(t=>t.account_id===a.id&&t.type==="gasto").reduce((ss,t)=>ss+t.amount,0); return s+a.balance+aIng-aGas;},0);
    const totalIng=transactions.filter(t=>t.type==="ingreso").reduce((s,t)=>s+t.amount,0);
    const totalGas=transactions.filter(t=>t.type==="gasto").reduce((s,t)=>s+t.amount,0);
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Saldos Xhus</title><style>body{font-family:sans-serif;padding:32px;color:#111;max-width:700px;margin:0 auto}h1{color:#4f46e5}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#4f46e5;color:white;padding:10px 14px;text-align:left}td{padding:10px 14px;border-bottom:1px solid #e5e7eb}.total{font-weight:700;background:#f8fafc}.resumen{display:flex;gap:16px;margin:20px 0;flex-wrap:wrap}.card{flex:1;min-width:150px;padding:16px;border-radius:12px;border-left:4px solid}@media print{body{padding:16px}}</style></head><body>
    <h1>◈ Contabilidad Xhus — Saldos</h1><p>${new Date().toLocaleDateString("es-ES",{dateStyle:"long"})}</p>
    <div class="resumen"><div class="card" style="background:#f0fdf4;border-color:#059669"><p style="margin:0;font-size:12px;color:#64748b">Total ingresos</p><p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#059669">${fmx(totalIng)}</p></div><div class="card" style="background:#fef2f2;border-color:#dc2626"><p style="margin:0;font-size:12px;color:#64748b">Total gastos</p><p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#dc2626">${fmx(totalGas)}</p></div><div class="card" style="background:#eff6ff;border-color:#4f46e5"><p style="margin:0;font-size:12px;color:#64748b">Balance total</p><p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${totalBal>=0?"#059669":"#dc2626"}">${fmx(totalBal)}</p></div></div>
    <table><thead><tr><th></th><th>Cuenta</th><th>Ingresos</th><th>Gastos</th><th>Saldo</th></tr></thead><tbody>${accRows}<tr class="total"><td colspan="2">TOTAL</td><td style="color:#059669">${fmx(totalIng)}</td><td style="color:#dc2626">${fmx(totalGas)}</td><td style="color:${totalBal>=0?"#059669":"#dc2626"}">${fmx(totalBal)}</td></tr></tbody></table>
    <script>window.onload=()=>window.print()</script></body></html>`;
    const blob=new Blob([html],{type:"text/html;charset=utf-8"}); const url=URL.createObjectURL(blob); window.open(url,"_blank");
    showToast("Resumen saldos abierto ✓","#059669"); onClose();
  };

  const doExportStocks = () => {
    const open = stocks.filter(s=>!s.sell_date);
    const closed = stocks.filter(s=>!!s.sell_date);
    const openRows = open.map(s=>{const inv=s.buy_price*s.quantity; const cur=(livePrices[s.id]||s.manual_price||s.buy_price)*s.quantity; const gain=cur-inv; const pct=((gain/inv)*100).toFixed(1); return `<tr><td>${s.name}</td><td>${s.ticker||"-"}</td><td>${s.quantity}</td><td>${s.buy_date}</td><td>${fmx(s.buy_price)}</td><td>${fmx(inv)}</td><td>${fmx((livePrices[s.id]||s.manual_price||s.buy_price))}</td><td style="color:${gain>=0?"#059669":"#dc2626"};font-weight:700">${gain>=0?"+":""}${fmx(gain)} (${pct}%)</td></tr>`;}).join("");
    const closedRows = closed.map(s=>{const inv=s.buy_price*s.quantity; const sold=(s.sell_price||0)*s.quantity; const gain=sold-inv; const pct=((gain/inv)*100).toFixed(1); return `<tr><td>${s.name}</td><td>${s.ticker||"-"}</td><td>${s.quantity}</td><td>${s.buy_date}</td><td>${fmx(s.buy_price)}</td><td>${s.sell_date}</td><td>${fmx(s.sell_price||0)}</td><td style="color:${gain>=0?"#059669":"#dc2626"};font-weight:700">${gain>=0?"+":""}${fmx(gain)} (${pct}%)</td></tr>`;}).join("");
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bolsa Xhus</title><style>body{font-family:sans-serif;padding:32px;color:#111}h1,h2{color:#4f46e5}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#4f46e5;color:white;padding:10px 12px;text-align:left}td{padding:8px 12px;border-bottom:1px solid #e5e7eb}@media print{body{padding:16px}}</style></head><body>
    <h1>📈 Contabilidad Xhus — Valores de Bolsa</h1><p>${new Date().toLocaleDateString("es-ES",{dateStyle:"long"})}</p>
    <h2>Posiciones abiertas</h2><table><thead><tr><th>Valor</th><th>Ticker</th><th>Cantidad</th><th>F.Compra</th><th>P.Compra</th><th>Invertido</th><th>P.Actual</th><th>Resultado</th></tr></thead><tbody>${openRows}</tbody></table>
    <h2>Historial (cerradas)</h2><table><thead><tr><th>Valor</th><th>Ticker</th><th>Cantidad</th><th>F.Compra</th><th>P.Compra</th><th>F.Venta</th><th>P.Venta</th><th>Resultado</th></tr></thead><tbody>${closedRows}</tbody></table>
    <script>window.onload=()=>window.print()</script></body></html>`;
    const blob=new Blob([html],{type:"text/html;charset=utf-8"}); const url=URL.createObjectURL(blob); window.open(url,"_blank");
    showToast("Reporte bolsa abierto ✓","#059669"); onClose();
  };

  const S = styles;
  return (
    <>
      <p style={S.modalTitle}>Exportar datos</p>
      <label style={S.label}>Cuenta</label>
      <select style={S.input} value={exportAcc} onChange={e=>setExportAcc(e.target.value)}>
        <option value="all">Todas las cuentas</option>
        {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
      </select>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><label style={S.label}>Desde</label><input style={S.input} type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)}/></div>
        <div><label style={S.label}>Hasta</label><input style={S.input} type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)}/></div>
      </div>
      {(exportFrom||exportTo||exportAcc!=="all") && <p style={{fontSize:13,color:"#4f46e5",marginTop:6,fontWeight:500}}>{getFiltered().length} movimientos seleccionados</p>}
      <div style={{display:"flex",flexDirection:"column",gap:10,margin:"16px 0"}}>
        <button style={S.exportBtn} onClick={doExportCSV}><span style={{fontSize:24}}>📊</span><div><b>Excel / CSV</b><p style={{margin:0,fontSize:13,color:"#94a3b8"}}>Compatible con Excel, Google Sheets</p></div></button>
        <button style={S.exportBtn} onClick={doExportHTML}><span style={{fontSize:24}}>📄</span><div><b>Reporte + Imprimir</b><p style={{margin:0,fontSize:13,color:"#94a3b8"}}>Incluye resumen de cuentas</p></div></button>
        <button style={S.exportBtn} onClick={doExportSaldos}><span style={{fontSize:24}}>🏦</span><div><b>Resumen de saldos</b><p style={{margin:0,fontSize:13,color:"#94a3b8"}}>Saldo de cada cuenta y balance total</p></div></button>
        <button style={S.exportBtn} onClick={doExportStocks}><span style={{fontSize:24}}>📈</span><div><b>Valores de bolsa</b><p style={{margin:0,fontSize:13,color:"#94a3b8"}}>Posiciones abiertas e historial</p></div></button>
      </div>
      <button style={S.btnCancel} onClick={onClose}>Cerrar</button>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email:"", password:"", name:"" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("login"); // login | register | confirm
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recurrents, setRecurrents] = useState([]);
  const [monthlyLimit, setMonthlyLimit] = useState(null);
  const [monthlyLimitForm, setMonthlyLimitForm] = useState("");
  const [stocks, setStocks] = useState([]);
  const [debts, setDebts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const isDesktop = window.innerWidth >= 768;
  const [view, setView] = useState(() => sessionStorage.getItem("xhus_view") || "dashboard");
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0,7));
  const [filter, setFilter] = useState("all");
  const [filterAcc, setFilterAcc] = useState("all");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("30d");
  const [filterMonthYear, setFilterMonthYear] = useState(new Date().toISOString().slice(0,7));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editTx, setEditTx] = useState(null);
  const [editAcc, setEditAcc] = useState(null);
  const [editBudget, setEditBudget] = useState(null);
  const [editRec, setEditRec] = useState(null);
  const [editStock, setEditStock] = useState(null);
  const [editDebt, setEditDebt] = useState(null);
  const [editProp, setEditProp] = useState(null);
  const [budgetDetail, setBudgetDetail] = useState(null);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [txForm, setTxForm] = useState({ date:today(), description:"", category:"", type:"gasto", amount:"", account_id:"", recurrence:"none", recurrence_end:"" });
  const [accForm, setAccForm] = useState({ name:"", bank:"", color:ACCOUNT_COLORS[0], icon:ACCOUNT_ICONS[0], balance:"", type:"cuenta", sort_order:0, dep1_amount:"", dep1_start:"", dep1_end:"", dep1_rate:"", dep2_amount:"", dep2_start:"", dep2_end:"", dep2_rate:"" });
  const [budgetForm, setBudgetForm] = useState({ category:"", amount:"" });
  const [recForm, setRecForm] = useState({ amount:"", type:"gasto", category:"", account_id:"", next_date:"" });
  const [stockForm, setStockForm] = useState({ account_id:"", name:"", ticker:"", buy_date:today(), buy_price:"", quantity:"", sell_date:"", sell_price:"", manual_price:"" });
  const [debtForm, setDebtForm] = useState({ name:"", total_amount:"", monthly_payment:"", start_date:today(), end_date:"", participation:100, interest_rate:"" });
  const [propForm, setPropForm] = useState({ name:"", address:"", size_m2:"", year_built:"", buy_price:"", buy_date:today(), cadastral_value:"", estimated_price:"", participation:100 });

  const { w } = useWindowSize();
  const isMobile = w < 768;
  const showToast = (msg, color="#4f46e5") => { setToast({msg,color}); setTimeout(()=>setToast(null),2600); };
  const setViewPersist = v => { setView(v); sessionStorage.setItem("xhus_view",v); };

  const requestNotifications = () => {
    if(!("Notification" in window)) { showToast("Tu navegador no soporta notificaciones","#ef4444"); return; }
    if(Notification.permission==="granted") { showToast("Notificaciones ya activadas ✓","#059669"); return; }
    if(Notification.permission==="denied") { showToast("Notificaciones bloqueadas. Actívalas en Ajustes","#ef4444"); return; }
    Notification.requestPermission().then(p=>{ if(p==="granted") showToast("Notificaciones activadas ✓","#059669"); else showToast("Permiso denegado","#ef4444"); });
  };

  const handleLogin = async () => {
    setLoginError(""); setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email:loginForm.email, password:loginForm.password });
    if(error) setLoginError("Email o contraseña incorrectos");
    setLoginLoading(false);
  };
  const handleRegister = async () => {
    setLoginError(""); setLoginLoading(true);
    if(!loginForm.name) { setLoginError("Introduce tu nombre"); setLoginLoading(false); return; }
    if(loginForm.password.length < 6) { setLoginError("La contraseña debe tener al menos 6 caracteres"); setLoginLoading(false); return; }
    const { error } = await supabase.auth.signUp({
      email: loginForm.email,
      password: loginForm.password,
      options: { data: { name: loginForm.name } }
    });
    if(error) { setLoginError(error.message); }
    else { setLoginMode("confirm"); }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setTransactions([]); setAccounts([]); setBudgets([]); setRecurrents([]); setMonthlyLimit(null); setStocks([]); setDebts([]); setProperties([]);
    sessionStorage.removeItem("xhus_view");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user??null); setAuthLoading(false); if(session?.user) loadAll(); });
    supabase.auth.onAuthStateChange((_e,session) => { setUser(session?.user??null); if(session?.user) loadAll(); });
  }, []);

  useEffect(() => {
    if(!user) return;
    const txSub  = supabase.channel('tx').on('postgres_changes',{event:'*',schema:'public',table:'transactions'},()=>loadTransactions()).subscribe();
    const accSub = supabase.channel('acc').on('postgres_changes',{event:'*',schema:'public',table:'accounts'},()=>loadAccounts()).subscribe();
    const budSub = supabase.channel('bud').on('postgres_changes',{event:'*',schema:'public',table:'budgets'},()=>loadBudgets()).subscribe();
    const recSub = supabase.channel('rec').on('postgres_changes',{event:'*',schema:'public',table:'recurrents'},()=>loadRecurrents()).subscribe();
    const stSub  = supabase.channel('st').on('postgres_changes',{event:'*',schema:'public',table:'stock_positions'},()=>loadStocks()).subscribe();
    const debtSub= supabase.channel('dbt').on('postgres_changes',{event:'*',schema:'public',table:'debts'},()=>loadDebts()).subscribe();
    const propSub= supabase.channel('prp').on('postgres_changes',{event:'*',schema:'public',table:'properties'},()=>loadProperties()).subscribe();
    return () => { [txSub,accSub,budSub,recSub,stSub,debtSub,propSub].forEach(s=>s.unsubscribe()); };
  }, [user]);

  const loadAll = async () => { setLoading(true); await Promise.all([loadTransactions(),loadAccounts(),loadBudgets(),loadRecurrents(),loadMonthlyLimit(),loadStocks(),loadDebts(),loadProperties()]); setLoading(false); };
  const loadTransactions = async () => { const {data}=await supabase.from("transactions").select("*").order("date",{ascending:false}).order("created_at",{ascending:false}); if(data) setTransactions(data); };
  const loadAccounts = async () => { const {data}=await supabase.from("accounts").select("*").order("sort_order",{ascending:true}); if(data) setAccounts(data); };
  const loadBudgets = async () => { const {data}=await supabase.from("budgets").select("*").order("created_at",{ascending:true}); if(data) setBudgets(data); };
  const loadRecurrents = async () => { const {data}=await supabase.from("recurrents").select("*").order("next_date",{ascending:true}); if(data) { setRecurrents(data); autoGenerateRecurrents(data); } };
  const loadMonthlyLimit = async () => { const {data}=await supabase.from("monthly_limit").select("*").limit(1).maybeSingle(); if(data) setMonthlyLimit(data); };
  const loadStocks = async () => { const {data}=await supabase.from("stock_positions").select("*").order("buy_date",{ascending:false}); if(data) { setStocks(data); fetchLivePrices(data); } };
  const loadDebts = async () => { const {data}=await supabase.from("debts").select("*").order("end_date",{ascending:true}); if(data) setDebts(data); };
  const loadProperties = async () => { const {data}=await supabase.from("properties").select("*").order("buy_date",{ascending:false}); if(data) setProperties(data); };

  const fetchLivePrices = async (stockList) => {
    const prices = {};
    for(const s of stockList) { if(s.ticker && !s.sell_date) { const p=await fetchStockPrice(s.ticker); if(p) prices[s.id]=p; } }
    setLivePrices(prices);
  };

  const autoGenerateRecurrents = async (recs) => {
    const todayStr = today();
    for(const rec of recs) {
      let nextDate = rec.next_date;
      const inserts = [];
      while(nextDate <= todayStr && (!rec.end_date || nextDate <= rec.end_date)) {
        inserts.push({ date:nextDate, description:rec.description, category:rec.category, type:rec.type, amount:rec.amount, account_id:rec.account_id, recurrence:rec.recurrence, user_id:rec.user_id });
        nextDate = getNextDate(nextDate, rec.recurrence);
      }
      if(inserts.length > 0) { await supabase.from("transactions").insert(inserts); await supabase.from("recurrents").update({next_date:nextDate}).eq("id",rec.id); }
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredTx = useMemo(() => {
    const todayStr = today();
    const d7=new Date(); d7.setDate(d7.getDate()-7); const from7=d7.toISOString().split("T")[0];
    const d30=new Date(); d30.setDate(d30.getDate()-30); const from30=d30.toISOString().split("T")[0];
    const d90=new Date(); d90.setDate(d90.getDate()-90); const from90=d90.toISOString().split("T")[0];
    if(filterPeriod==="upcoming") {
      return [...transactions].filter(t=>t.date>todayStr)
        .filter(t=>filter==="all"||t.type===filter)
        .filter(t=>filterAcc==="all"||t.account_id===filterAcc)
        .filter(t=>!filterCat||t.category===filterCat)
        .sort((a,b)=>a.date.localeCompare(b.date));
    }
    let list = [...transactions].filter(t=>t.date<=todayStr);
    if(filterPeriod==="7d") list=list.filter(t=>t.date>=from7&&t.date<=todayStr);
    else if(filterPeriod==="30d") list=list.filter(t=>t.date>=from30&&t.date<=todayStr);
    else if(filterPeriod==="90d") list=list.filter(t=>t.date>=from90&&t.date<=todayStr);
    else if(filterPeriod==="month") list=list.filter(t=>t.date.startsWith(filterMonthYear));
    if(selectedAccountId) list=list.filter(t=>t.account_id===selectedAccountId);
    return list
      .filter(t=>filter==="all"||t.type===filter)
      .filter(t=>filterAcc==="all"||t.account_id===filterAcc)
      .filter(t=>t.description.toLowerCase().includes(search.toLowerCase())||t.category.toLowerCase().includes(search.toLowerCase()))
      .filter(t=>!filterCat||t.category===filterCat)
      .filter(t=>!dateFrom||t.date>=dateFrom)
      .filter(t=>!dateTo||t.date<=dateTo);
  },[transactions,filter,filterAcc,search,filterCat,dateFrom,dateTo,selectedAccountId,filterPeriod,filterMonthYear]);

  const txWithBalance = useMemo(() => {
    const todayStr = today();
    const acc = selectedAccountId ? accounts.find(a=>a.id===selectedAccountId) : null;
    const allTx = [...transactions].filter(t=>selectedAccountId?t.account_id===selectedAccountId:true).filter(t=>t.date<=todayStr).sort((a,b)=>a.date.localeCompare(b.date)||(a.created_at||"").localeCompare(b.created_at||""));
    const balanceMap = {};
    if(acc) {
      let bal = acc.balance||0;
      allTx.forEach(t=>{ bal+=t.type==="ingreso"?t.amount:-t.amount; balanceMap[t.id]=bal; });
    } else {
      const accBals = {};
      accounts.forEach(a=>{accBals[a.id]=a.balance||0;});
      allTx.forEach(t=>{ if(accBals[t.account_id]===undefined) accBals[t.account_id]=0; accBals[t.account_id]+=t.type==="ingreso"?t.amount:-t.amount; balanceMap[t.id]=accBals[t.account_id]; });
    }
    const list = [...filteredTx].sort((a,b)=>a.date.localeCompare(b.date)||(a.created_at||"").localeCompare(b.created_at||""));
    return list.map(t=>({...t,runningBalance:balanceMap[t.id]??null})).reverse();
  },[filteredTx,selectedAccountId,accounts,transactions]);

  const endOfSelMonth = selectedMonth+"-31";
  const startOfSelMonth = selectedMonth+"-01";

  const totals = useMemo(()=>{
    const todayStr=today();
    const ing=transactions.filter(t=>t.type==="ingreso"&&t.category!=="Traspaso"&&t.date>=startOfSelMonth&&t.date<=endOfSelMonth&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
    const gas=transactions.filter(t=>t.type==="gasto"&&t.category!=="Traspaso"&&t.date>=startOfSelMonth&&t.date<=endOfSelMonth&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
    return {ingresos:ing,gastos:gas,balance:ing-gas};
  },[transactions,selectedMonth]);

  const accountTotals = useMemo(()=>{
    const map={};
    const todayStr=today();
    const curMonth=todayStr.slice(0,7);
    const curStart=curMonth+"-01";
    const curEnd=curMonth+"-31";
    accounts.forEach(a=>{
      const ing=transactions.filter(t=>t.account_id===a.id&&t.type==="ingreso"&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
      const gas=transactions.filter(t=>t.account_id===a.id&&t.type==="gasto"&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
      const monthIng=transactions.filter(t=>t.account_id===a.id&&t.type==="ingreso"&&t.date>=curStart&&t.date<=curEnd&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
      const monthGas=transactions.filter(t=>t.account_id===a.id&&t.type==="gasto"&&t.date>=curStart&&t.date<=curEnd&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
      map[a.id]={ingresos:monthIng,gastos:monthGas,balance:a.balance+ing-gas,txCount:transactions.filter(t=>t.account_id===a.id&&t.date>=curStart&&t.date<=curEnd&&t.date<=todayStr).length};
    });
    return map;
  },[accounts,transactions]);

  const byCategory = useMemo(()=>{
    const todayStr=today();
    const map={};
    transactions.filter(t=>t.type==="gasto"&&t.category!=="Traspaso"&&t.date>=startOfSelMonth&&t.date<=endOfSelMonth&&t.date<=todayStr).forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,7);
  },[transactions,selectedMonth]);

  const byIncomeCategory = useMemo(()=>{
    const todayStr=today();
    const map={};
    transactions.filter(t=>t.type==="ingreso"&&t.category!=="Traspaso"&&t.date>=startOfSelMonth&&t.date<=endOfSelMonth&&t.date<=todayStr).forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
  },[transactions,selectedMonth]);

  const monthlyData = useMemo(()=>{
    const map={};
    transactions.forEach(t=>{const m=new Date(t.date).getMonth(); if(!map[m])map[m]={ing:0,gas:0}; t.type==="ingreso"?map[m].ing+=t.amount:map[m].gas+=t.amount;});
    return map;
  },[transactions]);

  const budgetsWithSpent = useMemo(()=>{const todayStr=today(); return budgets.map(b=>{const spent=transactions.filter(t=>t.type==="gasto"&&t.category===b.category&&t.date>=startOfSelMonth&&t.date<=endOfSelMonth&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0); return {...b,spent};});},[budgets,transactions,selectedMonth]);

  const depositAlerts = useMemo(()=>{
    const alerts=[];
    accounts.filter(a=>a.type==="deposito").forEach(a=>{
      if(a.dep1_end){const d=daysUntil(a.dep1_end); if(d!==null&&d<=30&&d>=0) alerts.push({id:a.id+"_1",name:a.name,icon:a.icon,label:"Depósito 1",end_date:a.dep1_end,daysLeft:d});}
      if(a.dep2_end){const d=daysUntil(a.dep2_end); if(d!==null&&d<=30&&d>=0) alerts.push({id:a.id+"_2",name:a.name,icon:a.icon,label:"Depósito 2",end_date:a.dep2_end,daysLeft:d});}
    });
    return alerts.sort((a,b)=>a.daysLeft-b.daysLeft);
  },[accounts]);

  const monthlySavings = useMemo(()=>{
    const todayStr = today();
    const currentMonth = todayStr.slice(0,7);
    const lmStart=currentMonth+"-01", lmEnd=currentMonth+"-31";
    const monthIng=transactions.filter(t=>t.type==="ingreso"&&t.category!=="Traspaso"&&t.date>=lmStart&&t.date<=lmEnd&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
    const monthGas=transactions.filter(t=>t.type==="gasto"&&t.category!=="Traspaso"&&t.date>=lmStart&&t.date<=lmEnd&&t.date<=todayStr).reduce((s,t)=>s+t.amount,0);
    const totalPatrimony=accounts.reduce((s,a)=>{const t=accountTotals[a.id]; return s+(t?t.balance:a.balance);},0);
    return {monthIng,monthGas,saved:monthIng-monthGas,totalPatrimony,month:currentMonth};
  },[transactions,accounts,accountTotals]);

  const stocksWithValue = useMemo(()=>stocks.map(s=>{
    const livePrice=livePrices[s.id];
    const currentPrice=s.sell_price?s.sell_price:(livePrice||s.manual_price||s.buy_price);
    const priceSource=s.sell_price?"venta":livePrice?"live":s.manual_price?"manual":"compra";
    const currentValue=currentPrice*s.quantity;
    const invested=s.buy_price*s.quantity;
    const gain=currentValue-invested;
    const gainPct=(gain/invested)*100;
    return {...s,currentValue,invested,gain,gainPct,livePrice,currentPrice,priceSource};
  }),[stocks,livePrices]);

  const pieData = useMemo(()=>{
    return ACCOUNT_TYPES.map(type=>{
      const value=accounts.filter(a=>(a.type||"cuenta")===type).reduce((s,a)=>{
        const ing=transactions.filter(t=>t.account_id===a.id&&t.type==="ingreso"&&t.date<=endOfSelMonth).reduce((ss,t)=>ss+t.amount,0);
        const gas=transactions.filter(t=>t.account_id===a.id&&t.type==="gasto"&&t.date<=endOfSelMonth).reduce((ss,t)=>ss+t.amount,0);
        return s+a.balance+ing-gas;
      },0);
      return {label:ACCOUNT_TYPE_LABELS[type],value:Math.max(value,0),color:ACCOUNT_TYPE_COLORS[type]};
    }).filter(d=>d.value>0);
  },[accounts,transactions,selectedMonth]);

  const maxBar = Math.max(...Object.values(monthlyData).map(v=>Math.max(v.ing,v.gas)),1);

  // ── Transaction CRUD ──────────────────────────────────────────────────────
  const submitTx = async () => {
    const {date,description,category,type,amount,account_id,recurrence,recurrence_end}=txForm;
    if(!date||!description||!category||!account_id) return showToast("Completa todos los campos","#ef4444");
    const amt=parseFloat(amount);
    if(isNaN(amt)||amt<=0) return showToast("Importe inválido","#ef4444");
    if(editTx) {
      const {error}=await supabase.from("transactions").update({date,description,category,type,amount:amt,account_id}).eq("id",editTx);
      if(error) return showToast(error.message,"#ef4444");
      await loadTransactions(); showToast("Movimiento actualizado ✓","#059669"); setEditTx(null);
    } else {
      const {error}=await supabase.from("transactions").insert({date,description,category,type,amount:amt,account_id,recurrence,user_id:user.id});
      if(error) return showToast(error.message,"#ef4444");
      if(recurrence&&recurrence!=="none") {
        const nextDate=getNextDate(date,recurrence);
        await supabase.from("recurrents").insert({description,category,type,amount:amt,account_id,recurrence,end_date:recurrence_end||null,next_date:nextDate,user_id:user.id});
        await loadRecurrents(); await loadTransactions();
        showToast("Movimiento recurrente creado ✓","#059669");
        setTxForm({date:today(),description:"",category:"",type:"gasto",amount:"",account_id:accounts[0]?.id||"",recurrence:"none",recurrence_end:""});
        setViewPersist("recurrents"); return;
      } else { await loadTransactions(); showToast("Movimiento agregado ✓","#059669"); }
    }
    setTxForm({date:today(),description:"",category:"",type:"gasto",amount:"",account_id:accounts[0]?.id||"",recurrence:"none",recurrence_end:""});
    setViewPersist("transactions");
  };
  const startEditTx = t=>{setTxForm({date:t.date,description:t.description,category:t.category,type:t.type,amount:String(t.amount),account_id:t.account_id,recurrence:"none",recurrence_end:""}); setEditTx(t.id); setViewPersist("add");};
  const confirmDeleteTx = id=>{setDeleteId(id); setModal("deleteT");};
  const deleteTx = async()=>{
    // Find the transaction to delete
    const tx = transactions.find(t=>t.id===deleteId);
    if(tx && tx.recurrence && tx.recurrence!=="none") {
      // Also delete future recurring transactions with same description+account
      const todayStr = today();
      const futureIds = transactions
        .filter(t=>t.description===tx.description&&t.account_id===tx.account_id&&t.recurrence===tx.recurrence&&t.date>todayStr&&t.id!==deleteId)
        .map(t=>t.id);
      if(futureIds.length>0) {
        await supabase.from("transactions").delete().in("id",futureIds);
      }
    }
    await supabase.from("transactions").delete().eq("id",deleteId);
    await loadTransactions(); setModal(null); showToast("Eliminado","#f59e0b");
  };

  // ── Recurrent CRUD ────────────────────────────────────────────────────────
  const deleteRecurrent = async id=>{await supabase.from("recurrents").delete().eq("id",id); await loadRecurrents(); showToast("Recurrente eliminado","#f59e0b");};
  const startEditRec = r=>{setRecForm({amount:String(r.amount),type:r.type||"gasto",category:r.category||"",account_id:r.account_id||"",next_date:r.next_date||""}); setEditRec(r.id); setModal("editRec");};
  const saveRecAmount = async()=>{
    const amt=parseFloat(recForm.amount);
    if(isNaN(amt)||amt<=0) return showToast("Importe inválido","#ef4444");
    const payload={amount:amt};
    if(recForm.type) payload.type=recForm.type;
    if(recForm.category) payload.category=recForm.category;
    if(recForm.account_id) payload.account_id=recForm.account_id;
    if(recForm.next_date) payload.next_date=recForm.next_date;
    await supabase.from("recurrents").update(payload).eq("id",editRec);
    // Update future generated transactions if date changed
    if(recForm.next_date) {
      const rec = recurrents.find(r=>r.id===editRec);
      if(rec) {
        const todayStr = today();
        const futureIds = transactions.filter(t=>t.description===rec.description&&t.account_id===rec.account_id&&t.date>todayStr).map(t=>t.id);
        if(futureIds.length>0) await supabase.from("transactions").delete().in("id",futureIds);
      }
    }
    await loadRecurrents(); await loadTransactions();
    setModal(null); setEditRec(null); showToast("Recurrente actualizado ✓","#059669");
  };

  // ── Account CRUD ──────────────────────────────────────────────────────────
  const submitAcc = async()=>{
    const {name,bank,color,icon,balance,type,dep1_amount,dep1_start,dep1_end,dep1_rate,dep2_amount,dep2_start,dep2_end,dep2_rate}=accForm;
    if(!name||!bank) return showToast("Nombre y banco requeridos","#ef4444");
    const bal=parseFloat(balance)||0;
    const depPayload=type==="deposito"?{dep1_amount:dep1_amount?parseFloat(dep1_amount):null,dep1_start:dep1_start||null,dep1_end:dep1_end||null,dep1_rate:dep1_rate?parseFloat(dep1_rate):null,dep2_amount:dep2_amount?parseFloat(dep2_amount):null,dep2_start:dep2_start||null,dep2_end:dep2_end||null,dep2_rate:dep2_rate?parseFloat(dep2_rate):null}:{dep1_amount:null,dep1_start:null,dep1_end:null,dep1_rate:null,dep2_amount:null,dep2_start:null,dep2_end:null,dep2_rate:null};
    const sortOrder=accounts.length;
    if(editAcc){
      const {error}=await supabase.from("accounts").update({name,bank,color,icon,balance:bal,type,...depPayload}).eq("id",editAcc);
      if(error) return showToast("Error al actualizar","#ef4444");
      await loadAccounts(); showToast("Cuenta actualizada ✓","#059669");
    } else {
      const {error}=await supabase.from("accounts").insert({name,bank,color,icon,balance:bal,type,sort_order:sortOrder,user_id:user.id,...depPayload});
      if(error) return showToast("Error al crear cuenta","#ef4444");
      await loadAccounts(); showToast("Cuenta creada ✓","#059669");
    }
    setAccForm({name:"",bank:"",color:ACCOUNT_COLORS[0],icon:ACCOUNT_ICONS[0],balance:"",type:"cuenta",sort_order:0,dep1_amount:"",dep1_start:"",dep1_end:"",dep1_rate:"",dep2_amount:"",dep2_start:"",dep2_end:"",dep2_rate:""});
    setEditAcc(null); setModal(null);
  };
  const startEditAcc = a=>{setAccForm({name:a.name,bank:a.bank,color:a.color,icon:a.icon,balance:String(a.balance),type:a.type||"cuenta",sort_order:a.sort_order||0,dep1_amount:a.dep1_amount?String(a.dep1_amount):"",dep1_start:a.dep1_start||"",dep1_end:a.dep1_end||"",dep1_rate:a.dep1_rate?String(a.dep1_rate):"",dep2_amount:a.dep2_amount?String(a.dep2_amount):"",dep2_start:a.dep2_start||"",dep2_end:a.dep2_end||"",dep2_rate:a.dep2_rate?String(a.dep2_rate):""}); setEditAcc(a.id); setModal("editAcc");};
  const confirmDeleteAcc = id=>{setDeleteId(id); setModal("deleteA");};
  const deleteAcc = async()=>{
    if(accounts.length<=1) return showToast("Necesitas al menos una cuenta","#ef4444");
    await supabase.from("transactions").delete().eq("account_id",deleteId);
    await supabase.from("accounts").delete().eq("id",deleteId);
    await loadAccounts(); await loadTransactions(); setModal(null); showToast("Cuenta eliminada","#f59e0b");
  };
  const moveAccount = async(id,direction)=>{
    const newOrder=[...accounts];
    const idx=newOrder.findIndex(a=>a.id===id);
    const targetIdx=direction==="up"?idx-1:idx+1;
    if(targetIdx<0||targetIdx>=newOrder.length) return;
    [newOrder[idx],newOrder[targetIdx]]=[newOrder[targetIdx],newOrder[idx]];
    setAccounts(newOrder);
    await supabase.from("accounts").update({sort_order:idx}).eq("id",newOrder[idx].id);
    await supabase.from("accounts").update({sort_order:targetIdx}).eq("id",newOrder[targetIdx].id);
  };

  // ── Budget CRUD ───────────────────────────────────────────────────────────
  const submitBudget = async()=>{
    const {category,amount}=budgetForm;
    if(!category) return showToast("Selecciona una categoría","#ef4444");
    const amt=parseFloat(amount);
    if(isNaN(amt)||amt<=0) return showToast("Importe inválido","#ef4444");
    if(editBudget){await supabase.from("budgets").update({category,amount:amt}).eq("id",editBudget); await loadBudgets(); showToast("Presupuesto actualizado ✓","#059669");}
    else{if(budgets.find(b=>b.category===category)) return showToast("Ya existe presupuesto para esa categoría","#ef4444"); await supabase.from("budgets").insert({category,amount:amt,user_id:user.id}); await loadBudgets(); showToast("Presupuesto creado ✓","#059669");}
    setBudgetForm({category:"",amount:""}); setEditBudget(null); setModal(null);
  };
  const startEditBudget=b=>{setBudgetForm({category:b.category,amount:String(b.amount)}); setEditBudget(b.id); setModal("editBudget");};
  const confirmDeleteBudget=id=>{setDeleteId(id); setModal("deleteB");};
  const deleteBudget=async()=>{await supabase.from("budgets").delete().eq("id",deleteId); await loadBudgets(); setModal(null); showToast("Presupuesto eliminado","#f59e0b");};

  const saveMonthlyLimit=async()=>{
    const amt=parseFloat(monthlyLimitForm);
    if(isNaN(amt)||amt<=0) return showToast("Importe inválido","#ef4444");
    if(monthlyLimit){await supabase.from("monthly_limit").update({amount:amt}).eq("id",monthlyLimit.id);}
    else{await supabase.from("monthly_limit").insert({amount:amt,user_id:user.id});}
    await loadMonthlyLimit(); setMonthlyLimitForm(""); showToast("Límite mensual guardado ✓","#059669");
  };
  const deleteMonthlyLimit=async()=>{if(monthlyLimit) await supabase.from("monthly_limit").delete().eq("id",monthlyLimit.id); setMonthlyLimit(null); showToast("Límite mensual eliminado","#f59e0b");};

  // ── Stock CRUD ────────────────────────────────────────────────────────────
  const submitStock=async()=>{
    const {account_id,name,ticker,buy_date,buy_price,quantity,sell_date,sell_price,manual_price}=stockForm;
    if(!account_id||!name||!buy_date||!buy_price||!quantity) return showToast("Completa los campos obligatorios","#ef4444");
    const bp=parseFloat(buy_price),qty=parseFloat(quantity);
    if(isNaN(bp)||bp<=0||isNaN(qty)||qty<=0) return showToast("Precio y cantidad inválidos","#ef4444");
    const sp=sell_price?parseFloat(sell_price):null;
    const mp=manual_price?parseFloat(manual_price):null;
    const payload={account_id,name,ticker:ticker||null,buy_date,buy_price:bp,quantity:qty,sell_date:sell_date||null,sell_price:sp,manual_price:mp,user_id:user.id};
    if(editStock){await supabase.from("stock_positions").update(payload).eq("id",editStock); showToast("Valor actualizado ✓","#059669"); setEditStock(null);}
    else{await supabase.from("stock_positions").insert(payload); showToast("Valor añadido ✓","#059669");}
    setStockForm({account_id:"",name:"",ticker:"",buy_date:today(),buy_price:"",quantity:"",sell_date:"",sell_price:"",manual_price:""}); setModal(null);
  };
  const startEditStock=s=>{setStockForm({account_id:s.account_id,name:s.name,ticker:s.ticker||"",buy_date:s.buy_date,buy_price:String(s.buy_price),quantity:String(s.quantity),sell_date:s.sell_date||"",sell_price:s.sell_price?String(s.sell_price):"",manual_price:s.manual_price?String(s.manual_price):""}); setEditStock(s.id); setModal("newStock");};
  const deleteStock=async id=>{await supabase.from("stock_positions").delete().eq("id",id); await loadStocks(); showToast("Valor eliminado","#f59e0b");};

  // ── Debt CRUD ─────────────────────────────────────────────────────────────
  const submitDebt=async()=>{
    const {name,total_amount,monthly_payment,start_date,end_date,participation,interest_rate}=debtForm;
    if(!name||!total_amount||!monthly_payment||!start_date||!end_date) return showToast("Completa todos los campos","#ef4444");
    const ta=parseFloat(total_amount),mp=parseFloat(monthly_payment);
    if(isNaN(ta)||ta<=0||isNaN(mp)||mp<=0) return showToast("Importes inválidos","#ef4444");
    const ir=interest_rate?parseFloat(interest_rate):null;
    const payload={name,total_amount:ta,monthly_payment:mp,start_date,end_date,participation:parseInt(participation),interest_rate:ir,user_id:user.id};
    if(editDebt){await supabase.from("debts").update(payload).eq("id",editDebt); showToast("Deuda actualizada ✓","#059669"); setEditDebt(null);}
    else{await supabase.from("debts").insert(payload); showToast("Deuda añadida ✓","#059669");}
    setDebtForm({name:"",total_amount:"",monthly_payment:"",start_date:today(),end_date:"",participation:100,interest_rate:""}); setModal(null);
  };
  const startEditDebt=d=>{setDebtForm({name:d.name,total_amount:String(d.total_amount),monthly_payment:String(d.monthly_payment),start_date:d.start_date,end_date:d.end_date,participation:d.participation,interest_rate:d.interest_rate?String(d.interest_rate):""}); setEditDebt(d.id); setModal("newDebt");};
  const confirmDeleteDebt=id=>{setDeleteId(id); setModal("deleteDebt");};
  const deleteDebt=async()=>{await supabase.from("debts").delete().eq("id",deleteId); setModal(null); showToast("Deuda eliminada","#f59e0b");};

  // ── Property CRUD ─────────────────────────────────────────────────────────
  const submitProp=async()=>{
    const {name,address,size_m2,year_built,buy_price,buy_date,cadastral_value,estimated_price}=propForm;
    if(!name||!buy_price||!buy_date) return showToast("Completa los campos obligatorios","#ef4444");
    const bp=parseFloat(buy_price);
    if(isNaN(bp)||bp<=0) return showToast("Precio de compra inválido","#ef4444");
    const payload={name,address:address||null,size_m2:size_m2?parseFloat(size_m2):null,year_built:year_built?parseInt(year_built):null,buy_price:bp,buy_date,cadastral_value:cadastral_value?parseFloat(cadastral_value):null,estimated_price:estimated_price?parseFloat(estimated_price):null,participation:parseInt(propForm.participation)||100,user_id:user.id};
    if(editProp){await supabase.from("properties").update(payload).eq("id",editProp); showToast("Inmueble actualizado ✓","#059669"); setEditProp(null);}
    else{await supabase.from("properties").insert(payload); showToast("Inmueble añadido ✓","#059669");}
    setPropForm({name:"",address:"",size_m2:"",year_built:"",buy_price:"",buy_date:today(),cadastral_value:"",estimated_price:"",participation:100}); setModal(null);
  };
  const startEditProp=p=>{setPropForm({name:p.name,address:p.address||"",size_m2:p.size_m2?String(p.size_m2):"",year_built:p.year_built?String(p.year_built):"",buy_price:String(p.buy_price),buy_date:p.buy_date,cadastral_value:p.cadastral_value?String(p.cadastral_value):"",estimated_price:p.estimated_price?String(p.estimated_price):"",participation:p.participation||100}); setEditProp(p.id); setModal("newProp");};
  const confirmDeleteProp=id=>{setDeleteId(id); setModal("deleteProp");};
  const deleteProp=async()=>{await supabase.from("properties").delete().eq("id",deleteId); setModal(null); showToast("Inmueble eliminado","#f59e0b");};

  const S = styles;
  const navItems = [
    {v:"dashboard",   icon:"◉", label:"Resumen"},
    {v:"accounts",    icon:"⊞", label:"Cuentas"},
    {v:"transactions",icon:"≡", label:"Movimientos"},
    {v:"add",         icon:"＋", label:"Nuevo"},
    {v:"recurrents",  icon:"↺", label:"Recurrentes"},
    {v:"budgets",     icon:"◎", label:"Presupuestos"},
    {v:"debts",       icon:"⊗", label:"Deudas"},
    {v:"properties",  icon:"⌂", label:"Inmuebles"},
    {v:"stockhistory",icon:"📊", label:"Historial bolsa"},
  ];

  if(authLoading) return (<div style={{...S.root,alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}><span style={{fontSize:36,color:"#4f46e5"}}>◈</span><p style={{color:"#4f46e5",fontWeight:600,fontSize:18}}>Cargando…</p></div>);

  if(!user) return (
    <div style={{display:"flex",minHeight:"100vh",background:"#f8fafc",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:380,boxShadow:"0 8px 40px rgba(0,0,0,.10)",border:"1px solid #e2e8f0"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <span style={{fontSize:40,color:"#4f46e5"}}>◈</span>
          <h1 style={{margin:"12px 0 4px",fontSize:24,fontWeight:700,color:"#0f172a"}}>Contabilidad Xhus</h1>
          <p style={{margin:0,fontSize:15,color:"#94a3b8"}}>{loginMode==="confirm"?"Confirma tu email":loginMode==="register"?"Crea tu cuenta":"Inicia sesión para continuar"}</p>
        </div>

        {loginMode==="confirm" && (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <p style={{fontSize:40,margin:0}}>📧</p>
            <p style={{fontSize:15,color:"#1e293b",marginTop:12,fontWeight:600}}>Revisa tu email</p>
            <p style={{fontSize:14,color:"#64748b",marginTop:8}}>Te hemos enviado un enlace de confirmación a <b>{loginForm.email}</b>. Haz clic en el enlace para activar tu cuenta.</p>
            <button style={{marginTop:20,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 20px",cursor:"pointer",fontSize:14,color:"#4f46e5",fontWeight:600}} onClick={()=>{setLoginMode("login");setLoginError("");}}>Volver al login</button>
          </div>
        )}

        {loginMode!=="confirm" && <>
          {loginMode==="register" && <>
            <label style={{display:"block",fontSize:12,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Nombre</label>
            <input style={{width:"100%",background:"#f8fafc",border:"1px solid #e2e8f0",color:"#1e293b",borderRadius:10,padding:"11px 13px",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:14}} type="text" placeholder="Tu nombre" value={loginForm.name} onChange={e=>setLoginForm(f=>({...f,name:e.target.value}))}/>
          </>}
          <label style={{display:"block",fontSize:12,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Email</label>
          <input style={{width:"100%",background:"#f8fafc",border:"1px solid #e2e8f0",color:"#1e293b",borderRadius:10,padding:"11px 13px",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:14}} type="email" placeholder="tu@email.com" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(loginMode==="login"?handleLogin():handleRegister())}/>
          <label style={{display:"block",fontSize:12,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Contraseña</label>
          <input style={{width:"100%",background:"#f8fafc",border:"1px solid #e2e8f0",color:"#1e293b",borderRadius:10,padding:"11px 13px",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:6}} type="password" placeholder="••••••••" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(loginMode==="login"?handleLogin():handleRegister())}/>
          {loginError && <p style={{color:"#dc2626",fontSize:13,margin:"4px 0 8px",fontWeight:500}}>⚠ {loginError}</p>}
          <button style={{width:"100%",background:"#4f46e5",color:"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:700,cursor:"pointer",fontSize:16,marginTop:10,opacity:loginLoading?0.7:1}} onClick={loginMode==="login"?handleLogin:handleRegister} disabled={loginLoading}>
            {loginLoading?(loginMode==="login"?"Entrando…":"Registrando…"):(loginMode==="login"?"Entrar":"Crear cuenta")}
          </button>
          <div style={{textAlign:"center",marginTop:16}}>
            {loginMode==="login"
              ? <p style={{fontSize:14,color:"#64748b",margin:0}}>¿No tienes cuenta? <button style={{background:"none",border:"none",color:"#4f46e5",cursor:"pointer",fontSize:14,fontWeight:600,padding:0}} onClick={()=>{setLoginMode("register");setLoginError("");}}>Regístrate</button></p>
              : <p style={{fontSize:14,color:"#64748b",margin:0}}>¿Ya tienes cuenta? <button style={{background:"none",border:"none",color:"#4f46e5",cursor:"pointer",fontSize:14,fontWeight:600,padding:0}} onClick={()=>{setLoginMode("login");setLoginError("");}}>Inicia sesión</button></p>
            }
          </div>
        </>}
        <p style={{textAlign:"center",fontSize:12,color:"#94a3b8",marginTop:20}}>🔒 Tus datos están cifrados y son privados</p>
      </div>
    </div>
  );

  if(loading) return (<div style={{...S.root,alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}><span style={{fontSize:36,color:"#4f46e5"}}>◈</span><p style={{color:"#4f46e5",fontWeight:600,fontSize:18}}>Cargando Contabilidad Xhus…</p></div>);

  // ── Derived KPI values ────────────────────────────────────────────────────
  const importeTotal = (() => {
    const todayStr = today();
    return accounts.reduce((s,a)=>{
      const ing=transactions.filter(t=>t.account_id===a.id&&t.type==="ingreso"&&t.date<=endOfSelMonth&&t.date<=todayStr).reduce((ss,t)=>ss+t.amount,0);
      const gas=transactions.filter(t=>t.account_id===a.id&&t.type==="gasto"&&t.date<=endOfSelMonth&&t.date<=todayStr).reduce((ss,t)=>ss+t.amount,0);
      return s+a.balance+ing-gas;
    },0);
  })();
  const pendingDebts = debts.reduce((s,d)=>{
    const myMonthly=d.monthly_payment*d.participation/100;
    const start=new Date(d.start_date+"T00:00:00");
    const end=new Date(d.end_date+"T00:00:00");
    const elapsed=Math.max(0,Math.round((new Date()-start)/(1000*60*60*24*30)));
    const totalMonths=Math.max(1,Math.round((end-start)/(1000*60*60*24*30)));
    const remainingMonths=Math.max(0,totalMonths-elapsed);
    let remaining;
    if(d.interest_rate&&d.interest_rate>0){
      const tae=d.interest_rate/100;
      const mRate=Math.pow(1+tae,1/12)-1;
      remaining=remainingMonths>0?myMonthly*((1-Math.pow(1+mRate,-remainingMonths))/mRate):0;
    } else {
      remaining=Math.max(0,d.total_amount*d.participation/100-myMonthly*elapsed);
    }
    return s+remaining;
  },0);
  const patrimonio = importeTotal + properties.reduce((s,p)=>s+(p.estimated_price||p.buy_price)*(p.participation||100)/100,0) - pendingDebts;

  return (
    <div style={S.root}>
      {toast && <div style={{...S.toast,background:toast.color}}>{toast.msg}</div>}

      {/* SIDEBAR TOGGLE */}
      {isMobile && <button onClick={()=>setSidebarOpen(o=>!o)} style={{position:"fixed",top:12,left:sidebarOpen?226:8,zIndex:201,background:"#fff",border:"1px solid #e2e8f0",color:"#4f46e5",width:28,height:28,borderRadius:8,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"left .2s",boxShadow:"0 2px 8px rgba(0,0,0,.10)"}}>
        {sidebarOpen?"◀":"▶"}
      </button>}

      {/* MODALS */}
      {modal && (
        <div style={S.overlay} onClick={()=>setModal(null)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            {modal==="deleteT" && <><p style={S.modalTitle}>¿Eliminar movimiento?</p><p style={S.modalSub}>Esta acción no se puede deshacer.</p><div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>setModal(null)}>Cancelar</button><button style={S.btnDanger} onClick={deleteTx}>Eliminar</button></div></>}
            {modal==="deleteA" && <><p style={S.modalTitle}>¿Eliminar cuenta?</p><p style={S.modalSub}>Se eliminarán también todos sus movimientos.</p><div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>setModal(null)}>Cancelar</button><button style={S.btnDanger} onClick={deleteAcc}>Eliminar</button></div></>}
            {modal==="deleteB" && <><p style={S.modalTitle}>¿Eliminar presupuesto?</p><p style={S.modalSub}>Se borrará el límite para esa categoría.</p><div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>setModal(null)}>Cancelar</button><button style={S.btnDanger} onClick={deleteBudget}>Eliminar</button></div></>}
            {modal==="deleteDebt" && <><p style={S.modalTitle}>¿Eliminar deuda?</p><p style={S.modalSub}>Esta acción no se puede deshacer.</p><div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>setModal(null)}>Cancelar</button><button style={S.btnDanger} onClick={deleteDebt}>Eliminar</button></div></>}
            {modal==="deleteProp" && <><p style={S.modalTitle}>¿Eliminar inmueble?</p><p style={S.modalSub}>Esta acción no se puede deshacer.</p><div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>setModal(null)}>Cancelar</button><button style={S.btnDanger} onClick={deleteProp}>Eliminar</button></div></>}
            {modal==="editRec" && <>
              <p style={S.modalTitle}>Modificar recurrente</p>
              <p style={S.modalSub}>Los cambios se aplicarán a los siguientes movimientos.</p>
              <label style={S.label}>Tipo</label>
              <div style={{display:"flex",gap:8,marginBottom:4}}>
                {["ingreso","gasto"].map(tp=>(
                  <button key={tp} onClick={()=>setRecForm(f=>({...f,type:tp,category:""}))} style={{flex:1,padding:"9px",borderRadius:10,border:`2px solid ${recForm.type===tp?(tp==="ingreso"?"#34d399":"#f87171"):"#e2e8f0"}`,background:recForm.type===tp?(tp==="ingreso"?"#f0fdf4":"#fef2f2"):"#f8fafc",color:recForm.type===tp?(tp==="ingreso"?"#059669":"#dc2626"):"#64748b",fontWeight:600,cursor:"pointer",fontSize:14}}>
                    {tp==="ingreso"?"↑ Ingreso":"↓ Gasto"}
                  </button>
                ))}
              </div>
              <label style={S.label}>Categoría</label>
              <select style={S.input} value={recForm.category||""} onChange={e=>setRecForm(f=>({...f,category:e.target.value}))}>
                <option value="">-- Selecciona --</option>
                {CATEGORIES[recForm.type||"gasto"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <label style={S.label}>Cuenta</label>
              <select style={S.input} value={recForm.account_id||""} onChange={e=>setRecForm(f=>({...f,account_id:e.target.value}))}>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
              <label style={S.label}>Nueva fecha de inicio</label>
              <input style={S.input} type="date" value={recForm.next_date||""} onChange={e=>setRecForm(f=>({...f,next_date:e.target.value}))}/>
              <p style={{fontSize:12,color:"#94a3b8",margin:"2px 0 8px"}}>Cambiará los movimientos futuros generados</p>
              <label style={S.label}>Nuevo importe (€)</label>
              <input style={S.input} type="number" placeholder="0.00" value={recForm.amount} onChange={e=>setRecForm(f=>({...f,amount:e.target.value}))}/>
              <div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>setModal(null)}>Cancelar</button><button style={S.btnPrimary} onClick={saveRecAmount}>Guardar</button></div>
            </>}
            {(modal==="newAcc"||modal==="editAcc") && <>
              <p style={S.modalTitle}>{editAcc?"Editar cuenta":"Nueva cuenta"}</p>
              <label style={S.label}>Tipo</label>
              <div style={{display:"flex",gap:8,marginBottom:4}}>
                {ACCOUNT_TYPES.map(t=>(
                  <button key={t} onClick={()=>setAccForm(f=>({...f,type:t}))} style={{flex:1,padding:"8px",borderRadius:8,border:`2px solid ${accForm.type===t?ACCOUNT_TYPE_COLORS[t]:"#e2e8f0"}`,background:accForm.type===t?ACCOUNT_TYPE_COLORS[t]+"18":"#f8fafc",color:accForm.type===t?ACCOUNT_TYPE_COLORS[t]:"#64748b",fontWeight:600,cursor:"pointer",fontSize:13}}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <label style={S.label}>Nombre</label>
              <input style={S.input} placeholder="Mi cuenta…" value={accForm.name} onChange={e=>setAccForm(f=>({...f,name:e.target.value}))}/>
              <label style={S.label}>Banco / Institución</label>
              <input style={S.input} placeholder="BBVA, HSBC…" value={accForm.bank} onChange={e=>setAccForm(f=>({...f,bank:e.target.value}))}/>
              <label style={S.label}>Balance inicial (€)</label>
              <input style={S.input} type="number" placeholder="0.00" value={accForm.balance} onChange={e=>setAccForm(f=>({...f,balance:e.target.value}))}/>
              <label style={S.label}>Color</label>
              <div style={{display:"flex",gap:8,marginBottom:4}}>{ACCOUNT_COLORS.map(c=><button key={c} onClick={()=>setAccForm(f=>({...f,color:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,border:accForm.color===c?"3px solid #1e293b":"2px solid transparent",cursor:"pointer"}}/>)}</div>
              <label style={S.label}>Ícono</label>
              <div style={{display:"flex",gap:8,marginBottom:4}}>{ACCOUNT_ICONS.map(ic=><button key={ic} onClick={()=>setAccForm(f=>({...f,icon:ic}))} style={{fontSize:22,width:36,height:36,borderRadius:8,background:accForm.icon===ic?"#eef2ff":"transparent",border:accForm.icon===ic?"2px solid #4f46e5":"2px solid transparent",cursor:"pointer"}}>{ic}</button>)}</div>
              {accForm.type==="deposito" && <>
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px",marginTop:12}}>
                  <p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:"#059669"}}>Depósito 1</p>
                  <label style={S.label}>Importe (€)</label><input style={S.input} type="number" placeholder="0.00" value={accForm.dep1_amount} onChange={e=>setAccForm(f=>({...f,dep1_amount:e.target.value}))}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><label style={S.label}>Fecha inicio</label><input style={S.input} type="date" value={accForm.dep1_start} onChange={e=>setAccForm(f=>({...f,dep1_start:e.target.value}))}/></div>
                    <div><label style={S.label}>Fecha fin</label><input style={S.input} type="date" value={accForm.dep1_end} onChange={e=>setAccForm(f=>({...f,dep1_end:e.target.value}))}/></div>
                  </div>
                  <label style={S.label}>Interés % TAE</label><input style={S.input} type="number" placeholder="Ej. 2.5" value={accForm.dep1_rate} onChange={e=>setAccForm(f=>({...f,dep1_rate:e.target.value}))}/>
                </div>
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px",marginTop:10}}>
                  <p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:"#059669"}}>Depósito 2 (opcional)</p>
                  <label style={S.label}>Importe (€)</label><input style={S.input} type="number" placeholder="0.00" value={accForm.dep2_amount} onChange={e=>setAccForm(f=>({...f,dep2_amount:e.target.value}))}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><label style={S.label}>Fecha inicio</label><input style={S.input} type="date" value={accForm.dep2_start} onChange={e=>setAccForm(f=>({...f,dep2_start:e.target.value}))}/></div>
                    <div><label style={S.label}>Fecha fin</label><input style={S.input} type="date" value={accForm.dep2_end} onChange={e=>setAccForm(f=>({...f,dep2_end:e.target.value}))}/></div>
                  </div>
                  <label style={S.label}>Interés % TAE</label><input style={S.input} type="number" placeholder="Ej. 3.0" value={accForm.dep2_rate} onChange={e=>setAccForm(f=>({...f,dep2_rate:e.target.value}))}/>
                </div>
              </>}
              <div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>{setModal(null);setEditAcc(null);}}>Cancelar</button><button style={S.btnPrimary} onClick={submitAcc}>{editAcc?"Guardar":"Crear"}</button></div>
            </>}
            {(modal==="newBudget"||modal==="editBudget") && <>
              <p style={S.modalTitle}>{editBudget?"Editar presupuesto":"Nuevo presupuesto"}</p>
              <label style={S.label}>Categoría</label>
              <select style={S.input} value={budgetForm.category} onChange={e=>setBudgetForm(f=>({...f,category:e.target.value}))}>
                <option value="">-- Selecciona --</option>
                {CATEGORIES.gasto.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <label style={S.label}>Límite mensual (€)</label>
              <input style={S.input} type="number" placeholder="0.00" value={budgetForm.amount} onChange={e=>setBudgetForm(f=>({...f,amount:e.target.value}))}/>
              <div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>{setModal(null);setEditBudget(null);}}>Cancelar</button><button style={S.btnPrimary} onClick={submitBudget}>{editBudget?"Guardar":"Crear"}</button></div>
            </>}
            {(modal==="newStock"||modal==="editStock") && <>
              <p style={S.modalTitle}>{editStock?"Editar valor":"Añadir valor de bolsa"}</p>
              <label style={S.label}>Cuenta de bolsa</label>
              <select style={S.input} value={stockForm.account_id} onChange={e=>setStockForm(f=>({...f,account_id:e.target.value}))}>
                <option value="">-- Selecciona --</option>
                {accounts.filter(a=>(a.type||"cuenta")==="bolsa").map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
              <label style={S.label}>Nombre del valor</label>
              <input style={S.input} placeholder="Ej. Apple, Santander..." value={stockForm.name} onChange={e=>setStockForm(f=>({...f,name:e.target.value}))}/>
              <label style={S.label}>Ticker (para precio en tiempo real)</label>
              <input style={{...S.input,fontFamily:"monospace"}} placeholder="Ej. AAPL, SAN.MC, SOP.PA, GC=F" value={stockForm.ticker} onChange={e=>setStockForm(f=>({...f,ticker:e.target.value.toUpperCase()}))}/>
              <p style={{fontSize:12,color:"#94a3b8",margin:"2px 0 4px"}}>España:.MC · Francia:.PA · Alemania:.DE · USA: sin sufijo · Oro:GC=F</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={S.label}>Fecha compra</label><input style={S.input} type="date" value={stockForm.buy_date} onChange={e=>setStockForm(f=>({...f,buy_date:e.target.value}))}/></div>
                <div><label style={S.label}>Precio compra (€)</label><input style={S.input} type="number" placeholder="0.00" value={stockForm.buy_price} onChange={e=>setStockForm(f=>({...f,buy_price:e.target.value}))}/></div>
              </div>
              <label style={S.label}>Cantidad / Nº acciones</label>
              <input style={S.input} type="number" placeholder="0" value={stockForm.quantity} onChange={e=>setStockForm(f=>({...f,quantity:e.target.value}))}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={S.label}>Fecha venta (opcional)</label><input style={S.input} type="date" value={stockForm.sell_date} onChange={e=>setStockForm(f=>({...f,sell_date:e.target.value}))}/></div>
                <div><label style={S.label}>Precio venta (€)</label><input style={S.input} type="number" placeholder="0.00" value={stockForm.sell_price} onChange={e=>setStockForm(f=>({...f,sell_price:e.target.value}))}/></div>
              </div>
              <label style={S.label}>Precio actual manual (€) — si el ticker no funciona</label>
              <input style={S.input} type="number" placeholder="0.00" value={stockForm.manual_price} onChange={e=>setStockForm(f=>({...f,manual_price:e.target.value}))}/>
              <div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>{setModal(null);setEditStock(null);}}>Cancelar</button><button style={S.btnPrimary} onClick={submitStock}>{editStock?"Guardar":"Añadir"}</button></div>
            </>}
            {(modal==="newDebt"||modal==="editDebt") && <>
              <p style={S.modalTitle}>{editDebt?"Editar deuda":"Nueva deuda"}</p>
              <label style={S.label}>Nombre / Descripción</label>
              <input style={S.input} placeholder="Ej. Hipoteca, Préstamo coche..." value={debtForm.name} onChange={e=>setDebtForm(f=>({...f,name:e.target.value}))}/>
              <label style={S.label}>Importe total de la deuda (€)</label>
              <input style={S.input} type="number" placeholder="0.00" value={debtForm.total_amount} onChange={e=>setDebtForm(f=>({...f,total_amount:e.target.value}))}/>
              <label style={S.label}>Pago mensual (€)</label>
              <input style={S.input} type="number" placeholder="0.00" value={debtForm.monthly_payment} onChange={e=>setDebtForm(f=>({...f,monthly_payment:e.target.value}))}/>
              <label style={S.label}>TAE % (tipo de interés anual)</label>
              <input style={S.input} type="number" placeholder="Ej. 2.5" value={debtForm.interest_rate} onChange={e=>setDebtForm(f=>({...f,interest_rate:e.target.value}))}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={S.label}>Fecha inicio</label><input style={S.input} type="date" value={debtForm.start_date} onChange={e=>setDebtForm(f=>({...f,start_date:e.target.value}))}/></div>
                <div><label style={S.label}>Fecha fin</label><input style={S.input} type="date" value={debtForm.end_date} onChange={e=>setDebtForm(f=>({...f,end_date:e.target.value}))}/></div>
              </div>
              <label style={S.label}>% de participación en la deuda</label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                {[50,100].map(p=>(
                  <button key={p} onClick={()=>setDebtForm(f=>({...f,participation:p}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${debtForm.participation===p?"#dc2626":"#e2e8f0"}`,background:debtForm.participation===p?"#fef2f2":"#f8fafc",color:debtForm.participation===p?"#dc2626":"#64748b",fontWeight:600,cursor:"pointer",fontSize:14}}>{p}%</button>
                ))}
              </div>
              <div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>{setModal(null);setEditDebt(null);}}>Cancelar</button><button style={S.btnPrimary} onClick={submitDebt}>{editDebt?"Guardar":"Añadir"}</button></div>
            </>}
            {(modal==="newProp"||modal==="editProp") && <>
              <p style={S.modalTitle}>{editProp?"Editar inmueble":"Nuevo inmueble"}</p>
              <label style={S.label}>Nombre / Descripción *</label>
              <input style={S.input} placeholder="Ej. Piso Madrid, Casa rural..." value={propForm.name} onChange={e=>setPropForm(f=>({...f,name:e.target.value}))}/>
              <label style={S.label}>Dirección</label>
              <input style={S.input} placeholder="Calle, número, ciudad..." value={propForm.address} onChange={e=>setPropForm(f=>({...f,address:e.target.value}))}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={S.label}>Superficie m²</label><input style={S.input} type="number" placeholder="0" value={propForm.size_m2} onChange={e=>setPropForm(f=>({...f,size_m2:e.target.value}))}/></div>
                <div><label style={S.label}>Año construcción</label><input style={S.input} type="number" placeholder="2000" value={propForm.year_built} onChange={e=>setPropForm(f=>({...f,year_built:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={S.label}>Precio compra (€) *</label><input style={S.input} type="number" placeholder="0.00" value={propForm.buy_price} onChange={e=>setPropForm(f=>({...f,buy_price:e.target.value}))}/></div>
                <div><label style={S.label}>Fecha compra *</label><input style={S.input} type="date" value={propForm.buy_date} onChange={e=>setPropForm(f=>({...f,buy_date:e.target.value}))}/></div>
              </div>
              <label style={S.label}>Valor catastral (€)</label>
              <input style={S.input} type="number" placeholder="0.00" value={propForm.cadastral_value} onChange={e=>setPropForm(f=>({...f,cadastral_value:e.target.value}))}/>
              <label style={S.label}>Precio estimado de venta (€)</label>
              <input style={S.input} type="number" placeholder="0.00" value={propForm.estimated_price} onChange={e=>setPropForm(f=>({...f,estimated_price:e.target.value}))}/>
              {propForm.buy_price && propForm.estimated_price && (
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",marginTop:8,fontSize:13,color:"#059669",fontWeight:600}}>
                  📈 Rentabilidad estimada: {(((parseFloat(propForm.estimated_price)-parseFloat(propForm.buy_price))/parseFloat(propForm.buy_price))*100).toFixed(1)}% ({fmx(parseFloat(propForm.estimated_price)-parseFloat(propForm.buy_price))})
                </div>
              )}
              <label style={S.label}>% de participación en el inmueble</label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                {[50,100].map(p=>(
                  <button key={p} onClick={()=>setPropForm(f=>({...f,participation:p}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${propForm.participation===p?"#3b82f6":"#e2e8f0"}`,background:propForm.participation===p?"#eff6ff":"#f8fafc",color:propForm.participation===p?"#3b82f6":"#64748b",fontWeight:600,cursor:"pointer",fontSize:14}}>{p}%</button>
                ))}
              </div>
              <div style={S.modalBtns}><button style={S.btnCancel} onClick={()=>{setModal(null);setEditProp(null);}}>Cancelar</button><button style={S.btnPrimary} onClick={submitProp}>{editProp?"Guardar":"Añadir"}</button></div>
            </>}
            {modal==="export" && <ExportModal transactions={transactions} accounts={accounts} stocks={stocks} livePrices={livePrices} totals={totals} onClose={()=>setModal(null)} showToast={showToast}/>}
          </div>
        </div>
      )}

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && isMobile && <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(15,23,42,.3)",zIndex:99}}/>}

      {/* SIDEBAR */}
      {(sidebarOpen || !isMobile) && (
        <aside style={S.sidebar}>
          <div style={S.logo}><span style={S.logoIcon}>◈</span><span style={S.logoText}>Contabilidad Xhus</span></div>
          <nav style={S.nav}>
            {navItems.map(({v,icon,label})=>(
              <button key={v} style={{...S.navBtn,...(view===v?S.navBtnActive:{})}} onClick={()=>{setViewPersist(v); if(isMobile) setSidebarOpen(false); setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50); if(v!=="add"){setEditTx(null);setTxForm({date:today(),description:"",category:"",type:"gasto",amount:"",account_id:accounts[0]?.id||"",recurrence:"none",recurrence_end:""}); }}}>
                <span style={S.navIcon}>{icon}</span><span>{label}</span>
              </button>
            ))}
          </nav>
          <button style={S.exportSideBtn} onClick={()=>setModal("export")}>⬇ Exportar</button>
          <button style={{...S.exportSideBtn,marginTop:6,color:"#dc2626",borderColor:"#fecaca"}} onClick={handleLogout}>⏻ Cerrar sesión</button>
          <div style={S.sidebalBox}>
            <p style={S.sidebalLabel}>Balance total</p>
            <p style={{...S.sidebalAmt,color:totals.balance>=0?"#059669":"#dc2626"}}>{fmx(totals.balance)}</p>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
              <span style={{fontSize:12,color:"#059669"}}>↑ {fmx(totals.ingresos)}</span>
              <span style={{fontSize:12,color:"#dc2626"}}>↓ {fmx(totals.gastos)}</span>
            </div>
          </div>
          <p style={{fontSize:10,color:"#94a3b8",textAlign:"center",margin:"8px 0 4px"}}>© Jesús Cortijo · Marzo 2026</p>
        </aside>
      )}

      {/* MAIN */}
      <main style={{...S.main,marginLeft:sidebarOpen&&!isMobile?222:0,transition:"margin-left .2s"}}>

        {/* ══ DASHBOARD ══ */}
        {view==="dashboard" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            {/* Month selector */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:20}}>
              <h1 style={S.pageTitle}>Resumen financiero</h1>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button style={S.iconBtn} onClick={()=>{const [y,m]=selectedMonth.split("-").map(Number); const nd=m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`; setSelectedMonth(nd);}}>◀</button>
                <span style={{fontSize:14,fontWeight:600,color:"#4f46e5",minWidth:100,textAlign:"center"}}>{capFirst(new Date(selectedMonth+"-01T00:00:00").toLocaleDateString("es-ES",{month:"long",year:"numeric"}))}</span>
                <button style={S.iconBtn} onClick={()=>{const [y,m]=selectedMonth.split("-").map(Number); const nd=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,"0")}`; setSelectedMonth(nd);}}>▶</button>
              </div>
            </div>

            {/* Deposit alerts */}
            {depositAlerts.length>0 && (
              <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
                <p style={{margin:0,fontWeight:700,color:"#d97706",fontSize:14}}>⏰ Depósitos próximos a vencer</p>
                {depositAlerts.map(d=><p key={d.id} style={{margin:"4px 0 0",fontSize:13,color:"#92400e"}}>{d.icon} {d.name} — {d.label} — vence el {d.end_date} ({d.daysLeft===0?"hoy":d.daysLeft===1?"mañana":`en ${d.daysLeft} días`})</p>)}
              </div>
            )}


            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(5,1fr)",gap:12,marginBottom:20}}>
              {[
                {label:"Balance",      value:totals.balance,   color:totals.balance>=0?"#059669":"#dc2626", bg:totals.balance>=0?"#f0fdf4":"#fef2f2", border:totals.balance>=0?"#bbf7d0":"#fecaca"},
                {label:"Ingresos",     value:totals.ingresos,  color:"#059669", bg:"#f0fdf4", border:"#bbf7d0"},
                {label:"Gastos",       value:totals.gastos,    color:"#dc2626", bg:"#fef2f2", border:"#fecaca"},
                {label:"Importe total",value:importeTotal,     color:"#4f46e5", bg:"#eef2ff", border:"#c7d2fe"},
                {label:"Patrimonio",   value:patrimonio,       color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe"},
              ].map(({label,value,color,bg,border})=>(
                <div key={label} style={{borderRadius:14,padding:"14px 16px",background:bg,border:`1px solid ${border}`}}>
                  <p style={{fontSize:12,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",margin:0}}>{label}</p>
                  <p style={{fontSize:isMobile?16:20,fontWeight:700,margin:"4px 0 0",color}}>{fmx(value)}</p>
                </div>
              ))}
            </div>

            {/* Monthly savings */}
            <div style={{...S.card,background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:"1px solid #bbf7d0",marginBottom:16}}>
              <h2 style={{...S.cardTitle,marginBottom:12}}>💰 Ahorro de {capFirst(new Date().toLocaleDateString("es-ES",{month:"long",year:"numeric"}))} · {new Date().toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"})}</h2>
              <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Ingresos del mes</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#059669"}}>{fmx(monthlySavings.monthIng)}</p></div>
                <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Gastos del mes</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#dc2626"}}>{fmx(monthlySavings.monthGas)}</p></div>
                <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Ahorrado</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:monthlySavings.saved>=0?"#059669":"#dc2626"}}>{fmx(monthlySavings.saved)}</p></div>
                <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Importe total cuentas</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#4f46e5"}}>{fmx(monthlySavings.totalPatrimony)}</p></div>
              </div>
            </div>

            {/* Charts row */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:16}}>
              <div style={S.card}>
                <h2 style={S.cardTitle}>Actividad mensual</h2>
                <div style={{display:"flex",alignItems:"flex-end",gap:3,height:90,marginBottom:8}}>
                  {MONTHS.map((m,i)=>{ const d=monthlyData[i]||{ing:0,gas:0}; return (
                    <div key={m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%"}}>
                      <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:2,width:"100%"}}>
                        <div style={{flex:1,borderRadius:"3px 3px 0 0",minHeight:2,background:"#34d399",height:`${(d.ing/maxBar)*100}%`}}/>
                        <div style={{flex:1,borderRadius:"3px 3px 0 0",minHeight:2,background:"#f87171",height:`${(d.gas/maxBar)*100}%`}}/>
                      </div>
                      <span style={{fontSize:8,color:"#94a3b8"}}>{m}</span>
                    </div>
                  );})}
                </div>
                <div style={{display:"flex",alignItems:"center"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:"#34d399",display:"inline-block"}}/><span style={{fontSize:12,color:"#94a3b8",marginLeft:4}}>Ingresos</span>
                  <span style={{width:8,height:8,borderRadius:"50%",background:"#f87171",display:"inline-block",marginLeft:12}}/><span style={{fontSize:12,color:"#94a3b8",marginLeft:4}}>Gastos</span>
                </div>
              </div>
              <div style={S.card}>
                <h2 style={S.cardTitle}>Distribución patrimonial</h2>
                <PieChart data={pieData}/>
              </div>
            </div>

            {/* Tops row */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:16}}>
              <div style={S.card}>
                <h2 style={S.cardTitle}>Top gastos</h2>
                {byCategory.length===0 && <p style={S.empty}>Sin gastos en este período</p>}
                {byCategory.map(([cat,val])=>(
                  <div key={cat} style={S.catRow}>
                    <div style={S.catInfo}><span style={S.catName}>{cat}</span><span style={S.catVal}>{fmx(val)}</span></div>
                    <div style={S.progTrack}><div style={{...S.progBar,width:`${Math.min((val/(totals.gastos||1))*100,100)}%`}}/></div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <h2 style={S.cardTitle}>Top ingresos</h2>
                {byIncomeCategory.length===0 && <p style={S.empty}>Sin ingresos en este período</p>}
                {byIncomeCategory.map(([cat,val])=>(
                  <div key={cat} style={S.catRow}>
                    <div style={S.catInfo}><span style={S.catName}>{cat}</span><span style={{...S.catVal,color:"#059669"}}>{fmx(val)}</span></div>
                    <div style={S.progTrack}><div style={{...S.progBar,width:`${Math.min((val/(totals.ingresos||1))*100,100)}%`,background:"linear-gradient(90deg,#059669,#34d399)"}}/></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accounts by type */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":`repeat(${Math.max(1,ACCOUNT_TYPES.filter(type=>accounts.some(a=>(a.type||"cuenta")===type)).length)},1fr)`,gap:16,marginBottom:16}}>
              {ACCOUNT_TYPES.filter(type=>accounts.some(a=>(a.type||"cuenta")===type)).map(type=>{
                const typeAccs=[...accounts].filter(a=>(a.type||"cuenta")===type);
                return (
                  <div key={type} style={S.card}>
                    <h2 style={{...S.cardTitle,color:ACCOUNT_TYPE_COLORS[type]}}>{ACCOUNT_TYPE_LABELS[type]}</h2>
                    {typeAccs.map(a=>{
                      const tot=accountTotals[a.id]||{balance:a.balance};
                      return (
                        <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,background:"#f8fafc",border:"1px solid #e2e8f0",marginBottom:4,cursor:"pointer"}} onClick={()=>{setSelectedAccountId(a.id);setViewPersist("transactions");}}>
                          <span style={{fontSize:18}}>{a.icon}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:0,fontSize:13,fontWeight:600,color:"#1e293b",wordBreak:"break-word"}}>{a.name}</p>
                            <p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{a.bank}</p>
                          </div>
                          <p style={{margin:0,fontWeight:700,color:tot.balance>=0?"#059669":"#dc2626",fontSize:14,flexShrink:0}}>{fmx(tot.balance)}</p>
                        </div>
                      );
                    })}
                    <div style={{borderTop:"1px solid #f1f5f9",paddingTop:8,marginTop:4,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#94a3b8"}}>{typeAccs.length} cuenta{typeAccs.length!==1?"s":""}</span>
                      <span style={{fontSize:13,fontWeight:700,color:ACCOUNT_TYPE_COLORS[type]}}>{fmx(typeAccs.reduce((s,a)=>{const t=accountTotals[a.id]; return s+(t?t.balance:a.balance);},0))}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent movements */}
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <h2 style={S.cardTitle}>Últimos movimientos</h2>
                <button style={S.linkBtn} onClick={()=>{setFilterPeriod("month");setFilterMonthYear(selectedMonth);setFilter("all");setFilterAcc("all");setFilterCat("");setSearch("");setDateFrom("");setDateTo("");setViewPersist("transactions");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50);}}>Ver todos →</button>
              </div>
              {(()=>{const todayStr=today(); const filtered=transactions.filter(t=>t.date>=startOfSelMonth&&t.date<=endOfSelMonth&&t.date<=todayStr); return filtered.length===0?<p style={S.empty}>Sin movimientos en este mes</p>:filtered.slice(0,5).map(t=><TxRow key={t.id} t={t} accounts={accounts} onEdit={startEditTx} onDelete={confirmDeleteTx} showBalance={false}/>);})()}
            </div>
          </div>
        )}

        {/* ══ ACCOUNTS ══ */}
        {view==="accounts" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            <div style={S.pageHeader}>
              <div><h1 style={S.pageTitle}>Mis Cuentas</h1><p style={S.pageSub}>{accounts.length} cuentas registradas</p></div>
              <button style={S.btnPrimary} onClick={()=>{setAccForm({name:"",bank:"",color:ACCOUNT_COLORS[0],icon:ACCOUNT_ICONS[0],balance:"",type:"cuenta",sort_order:0,dep1_amount:"",dep1_start:"",dep1_end:"",dep1_rate:"",dep2_amount:"",dep2_start:"",dep2_end:"",dep2_rate:""});setEditAcc(null);setModal("newAcc");}}>+ Nueva</button>
            </div>

            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[
                {label:"Total patrimonio",value:accounts.reduce((s,a)=>{const t=accountTotals[a.id]; return s+(t?t.balance:a.balance);},0),color:"#4f46e5",bg:"#eef2ff",border:"#c7d2fe"},
                ...ACCOUNT_TYPES.map(type=>({label:ACCOUNT_TYPE_LABELS[type],value:accounts.filter(a=>(a.type||"cuenta")===type).reduce((s,a)=>{const t=accountTotals[a.id]; return s+(t?t.balance:a.balance);},0),color:ACCOUNT_TYPE_COLORS[type],bg:type==="cuenta"?"#eef2ff":type==="deposito"?"#f0fdf4":"#fffbeb",border:type==="cuenta"?"#c7d2fe":type==="deposito"?"#bbf7d0":"#fde68a"}))
              ].map(({label,value,color,bg,border})=>(
                <div key={label} style={{borderRadius:14,padding:"14px 16px",background:bg,border:`1px solid ${border}`}}>
                  <p style={{fontSize:12,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",margin:0}}>{label}</p>
                  <p style={{fontSize:isMobile?15:20,fontWeight:700,margin:"4px 0 0",color}}>{fmx(value)}</p>
                </div>
              ))}
            </div>

            <p style={{fontSize:13,color:"#94a3b8",marginBottom:12}}>💡 Usa ▲▼ para cambiar el orden</p>

            {/* Deposit alerts */}
            {depositAlerts.length>0 && (
              <div style={{...S.card,background:"#fffbeb",border:"1px solid #fde68a",marginBottom:16}}>
                <h2 style={{...S.cardTitle,color:"#d97706"}}>⏰ Depósitos próximos a vencer</h2>
                {depositAlerts.map(d=>(
                  <div key={d.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #fef3c7"}}>
                    <span style={{fontSize:14,color:"#92400e",fontWeight:600}}>{d.icon} {d.name} — {d.label}</span>
                    <span style={{fontSize:14,color:"#d97706"}}>{d.end_date} · {d.daysLeft===0?"Vence hoy":d.daysLeft===1?"Vence mañana":`${d.daysLeft} días`}</span>
                  </div>
                ))}
              </div>
            )}

            {ACCOUNT_TYPES.map(type=>{
              const typeAccounts=accounts.filter(a=>(a.type||"cuenta")===type);
              if(typeAccounts.length===0) return null;
              return (
                <div key={type} style={{marginBottom:24}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:ACCOUNT_TYPE_COLORS[type]}}/>
                    <h2 style={{fontSize:16,fontWeight:700,color:"#1e293b",margin:0}}>{ACCOUNT_TYPE_LABELS[type]}</h2>
                    <span style={{fontSize:13,color:"#94a3b8"}}>({typeAccounts.length})</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>
                    {typeAccounts.map(a=>{
                      const tot=accountTotals[a.id]||{ingresos:0,gastos:0,balance:a.balance,txCount:0};
                      return (
                        <div key={a.id} style={{...S.accCard,borderTop:`3px solid ${a.color}`,cursor:"pointer"}} onClick={()=>{setSelectedAccountId(a.id);setViewPersist("transactions");}}>
                          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                            <div style={{width:40,height:40,borderRadius:10,background:a.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{a.icon}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{margin:0,fontWeight:700,color:"#0f172a",fontSize:15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.name}</p>
                              <p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{a.bank}</p>
                            </div>
                            <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                              <button style={S.iconBtn} onClick={()=>moveAccount(a.id,"up")}>▲</button>
                              <button style={S.iconBtn} onClick={()=>moveAccount(a.id,"down")}>▼</button>
                              <button style={S.iconBtn} onClick={()=>startEditAcc(a)}>✎</button>
                              <button style={{...S.iconBtn,...S.iconBtnDel}} onClick={()=>confirmDeleteAcc(a.id)}>✕</button>
                            </div>
                          </div>
                          <p style={{margin:"0 0 12px",fontSize:22,fontWeight:700,color:tot.balance>=0?"#059669":"#dc2626"}}>{fmx(tot.balance)}</p>
                          <p style={{margin:"8px 0 4px",fontSize:10,color:"#94a3b8"}}>Este mes</p>
                          <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #f1f5f9",paddingTop:10}}>
                            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Ingresos</p><p style={{margin:0,fontSize:13,color:"#059669",fontWeight:600}}>{fmx(tot.ingresos)}</p></div>
                            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Gastos</p><p style={{margin:0,fontSize:13,color:"#dc2626",fontWeight:600}}>{fmx(tot.gastos)}</p></div>
                            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Balance mov.</p><p style={{margin:0,fontSize:13,color:tot.ingresos-tot.gastos>=0?"#059669":"#dc2626",fontWeight:600}}>{fmx(tot.ingresos-tot.gastos)}</p></div>
                            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Movs.</p><p style={{margin:0,fontSize:13,color:"#4f46e5",fontWeight:600}}>{tot.txCount}</p></div>
                          </div>
                          {a.type==="deposito"&&(a.dep1_end||a.dep2_end)&&(
                            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
                              {[{n:1,amt:a.dep1_amount,start:a.dep1_start,end:a.dep1_end,rate:a.dep1_rate},{n:2,amt:a.dep2_amount,start:a.dep2_start,end:a.dep2_end,rate:a.dep2_rate}].filter(d=>d.amt||d.end).map(d=>{
                                const days=daysUntil(d.end);
                                const col=days!==null&&days<=7?"#dc2626":days!==null&&days<=30?"#d97706":"#059669";
                                return (
                                  <div key={d.n} style={{background:days!==null&&days<=30?"#fffbeb":"#f0fdf4",borderRadius:8,padding:"6px 10px"}}>
                                    <div style={{display:"flex",justifyContent:"space-between"}}>
                                      <span style={{fontSize:12,fontWeight:700,color:"#059669"}}>Depósito {d.n}</span>
                                      {d.amt&&<span style={{fontSize:13,fontWeight:700,color:"#1e293b"}}>{fmx(d.amt)}</span>}
                                    </div>
                                    {d.end&&<p style={{margin:"2px 0 0",fontSize:12,color:col,fontWeight:600}}>{d.start&&`${d.start} → `}{d.end}{days!==null&&days<=30&&` (${days===0?"hoy":days===1?"mañana":`${days}d`})`}{d.rate&&<span style={{marginLeft:6,color:"#64748b"}}>{d.rate}%</span>}</p>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {accounts.length===0 && <div style={{...S.card,textAlign:"center",padding:"48px"}}><p style={{fontSize:32,margin:0}}>⊞</p><p style={{color:"#94a3b8",marginTop:8}}>Sin cuentas. Crea tu primera cuenta.</p><button style={{...S.btnPrimary,marginTop:12}} onClick={()=>setModal("newAcc")}>Crear cuenta</button></div>}

            {/* Stocks section */}
            {accounts.some(a=>(a.type||"cuenta")==="bolsa") && (
              <div style={{marginTop:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#d97706"}}/>
                    <h2 style={{fontSize:16,fontWeight:700,color:"#1e293b",margin:0}}>Posiciones de bolsa abiertas</h2>
                  </div>
                  <button style={S.btnPrimary} onClick={(e)=>{e.stopPropagation();setStockForm({account_id:accounts.find(a=>a.type==="bolsa")?.id||"",name:"",ticker:"",buy_date:today(),buy_price:"",quantity:"",sell_date:"",sell_price:"",manual_price:""});setEditStock(null);setModal("newStock");}}>+ Añadir valor</button>
                </div>
                {stocksWithValue.filter(s=>!s.sell_date).length===0 && <p style={{...S.empty,textAlign:"left"}}>Sin posiciones abiertas</p>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
                  {stocksWithValue.filter(s=>!s.sell_date).map(s=>{
                    const acc=accounts.find(a=>a.id===s.account_id);
                    return (
                      <div key={s.id} style={{...S.accCard,borderTop:`3px solid ${s.gain>=0?"#059669":"#dc2626"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div><p style={{margin:0,fontWeight:700,color:"#0f172a",fontSize:16}}>{s.name}</p><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{acc?.name} · {s.quantity} acciones{s.ticker&&` · ${s.ticker}`}</p></div>
                          <div style={{display:"flex",gap:4}}>
                            <button style={S.iconBtn} onClick={()=>startEditStock(s)}>✎</button>
                            <button style={{...S.iconBtn,...S.iconBtnDel}} onClick={()=>deleteStock(s.id)}>✕</button>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                          <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Compra</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#1e293b"}}>{fmx(s.buy_price)}</p><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{s.buy_date}</p></div>
                          <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{s.priceSource==="live"?"Precio actual":s.priceSource==="manual"?"Precio manual":"Precio compra"}</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#1e293b"}}>{fmx(s.currentPrice)}</p>{s.priceSource==="live"&&<p style={{margin:0,fontSize:12,color:"#4f46e5"}}>🟢 En vivo</p>}{s.priceSource==="manual"&&<p style={{margin:0,fontSize:12,color:"#d97706"}}>✏️ Manual</p>}</div>
                        </div>
                        <div style={{borderTop:"1px solid #f1f5f9",paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Invertido</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#1e293b"}}>{fmx(s.invested)}</p></div>
                          <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Resultado</p><p style={{margin:0,fontSize:15,fontWeight:700,color:s.gain>=0?"#059669":"#dc2626"}}>{s.gain>=0?"+":""}{fmx(s.gain)} ({s.gainPct>=0?"+":""}{s.gainPct.toFixed(1)}%)</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TRANSACTIONS ══ */}
        {view==="transactions" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            <div style={S.pageHeader}>
              <div>
                <h1 style={S.pageTitle}>{selectedAccountId?(accounts.find(a=>a.id===selectedAccountId)?.name||"Movimientos"):"Movimientos"}</h1>
                <p style={S.pageSub}>{filteredTx.length} registros</p>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {selectedAccountId&&<button style={S.btnSecondary} onClick={()=>setSelectedAccountId(null)}>✕ Todas</button>}
                <button style={S.btnSecondary} onClick={()=>setModal("export")}>⬇ Exportar</button>
                <button style={S.btnPrimary} onClick={()=>{setViewPersist("add");setEditTx(null);}}>+ Nuevo</button>
              </div>
            </div>

            {/* Period + type filters */}
            <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
              {[["30d","30 días"],["90d","90 días"],["all","Todo"],["upcoming","Próximos"]].map(([v,l])=>(
                <button key={v} style={{...S.tab,...(filterPeriod===v?S.tabActive:{}),borderRadius:8,border:"1px solid #e2e8f0",padding:"6px 10px",fontSize:12}} onClick={()=>{setFilterPeriod(v);setDateFrom("");setDateTo("");setShowMonthPicker(false);}}>
                  {l}
                </button>
              ))}
              <div style={{position:"relative"}}>
                <button style={{...S.tab,...(filterPeriod==="month"?S.tabActive:{}),borderRadius:8,border:"1px solid #e2e8f0",padding:"6px 10px",fontSize:12}} onClick={()=>{setFilterPeriod("month");setShowMonthPicker(p=>!p);setDateFrom("");setDateTo("");}}>
                  {filterPeriod==="month"?capFirst(new Date(filterMonthYear+"-01T00:00:00").toLocaleDateString("es-ES",{month:"short",year:"numeric"})):"Mes"}
                </button>
                {showMonthPicker&&filterPeriod==="month"&&(
                  <div style={{position:"absolute",top:"100%",left:0,background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:12,zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,.12)",minWidth:200}}>
                    <input type="month" value={filterMonthYear} onChange={e=>{setFilterMonthYear(e.target.value);setShowMonthPicker(false);}} style={{...S.input,marginBottom:8}}/>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                      {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m,i)=>{
                        const year=new Date().getFullYear();
                        const val=`${year}-${String(i+1).padStart(2,"0")}`;
                        return <button key={m} style={{padding:"6px",borderRadius:6,border:"1px solid #e2e8f0",background:filterMonthYear===val?"#eef2ff":"#f8fafc",color:filterMonthYear===val?"#4f46e5":"#64748b",cursor:"pointer",fontSize:12}} onClick={()=>{setFilterMonthYear(val);setShowMonthPicker(false);}}>{m}</button>;
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
            {/* Search + account + category */}
            <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
              <input style={{...S.search,flex:2,minWidth:120}} placeholder="Buscar…" value={search} onChange={e=>setSearch(e.target.value)}/>
              {!selectedAccountId&&(
                <select style={{...S.input,flex:1,minWidth:100,padding:"7px 8px",fontSize:12}} value={filterAcc} onChange={e=>setFilterAcc(e.target.value)}>
                  <option value="all">Todas las cuentas</option>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              <select style={{...S.input,flex:1,minWidth:100,padding:"7px 8px",fontSize:12}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                <option value="">Todas categorías</option>
                {[...new Set([...CATEGORIES.ingreso,...CATEGORIES.gasto])].sort().map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              <label style={{fontSize:12,color:"#64748b",fontWeight:600,whiteSpace:"nowrap"}}>Desde</label>
              <input style={{...S.search,width:"auto"}} type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              <label style={{fontSize:12,color:"#64748b",fontWeight:600,whiteSpace:"nowrap"}}>Hasta</label>
              <input style={{...S.search,width:"auto"}} type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
              {(dateFrom||dateTo)&&<button style={{...S.btnCancel,padding:"6px 10px",fontSize:12}} onClick={()=>{setDateFrom("");setDateTo("");}}>✕ Limpiar</button>}
            </div>
            <div style={S.card}>
              {txWithBalance.length===0&&<p style={S.empty}>No se encontraron movimientos</p>}
              {txWithBalance.map(t=><TxRow key={t.id} t={t} accounts={accounts} onEdit={startEditTx} onDelete={confirmDeleteTx} showBalance={true}/>)}
            </div>
          </div>
        )}

        {/* ══ ADD/EDIT TX ══ */}
        {view==="add" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            <h1 style={S.pageTitle}>{editTx?"Editar movimiento":"Nuevo movimiento"}</h1>
            <p style={S.pageSub}>{editTx?"Modifica los datos":"Registra un ingreso o gasto"}</p>
            <div style={{...S.card,maxWidth:520}}>
              <div style={{display:"flex",gap:8,marginBottom:18}}>
                {["ingreso","gasto"].map(tp=>(
                  <button key={tp} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${txForm.type===tp?(tp==="ingreso"?"#34d399":"#f87171"):"#e2e8f0"}`,background:txForm.type===tp?(tp==="ingreso"?"#f0fdf4":"#fef2f2"):"#f8fafc",color:txForm.type===tp?(tp==="ingreso"?"#059669":"#dc2626"):"#64748b",fontWeight:600,cursor:"pointer",fontSize:14,transition:"all .15s"}} onClick={()=>setTxForm(f=>({...f,type:tp,category:""}))}>
                    {tp==="ingreso"?"↑ Ingreso":"↓ Gasto"}
                  </button>
                ))}
              </div>
              <label style={S.label}>Fecha</label>
              <input style={S.input} type="date" value={txForm.date} onChange={e=>setTxForm(f=>({...f,date:e.target.value}))}/>
              <label style={S.label}>Descripción</label>
              <input style={S.input} placeholder="Ej. Supermercado, Nómina…" value={txForm.description} onChange={e=>setTxForm(f=>({...f,description:e.target.value}))}/>
              <label style={S.label}>Categoría</label>
              <select style={S.input} value={txForm.category} onChange={e=>setTxForm(f=>({...f,category:e.target.value}))}>
                <option value="">-- Selecciona --</option>
                {CATEGORIES[txForm.type].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <label style={S.label}>Cuenta</label>
              <select style={S.input} value={txForm.account_id} onChange={e=>setTxForm(f=>({...f,account_id:e.target.value}))}>
                <option value="">-- Selecciona --</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
              <label style={S.label}>Importe (€)</label>
              <input style={S.input} type="number" min="0" placeholder="0.00" value={txForm.amount} onChange={e=>setTxForm(f=>({...f,amount:e.target.value}))}/>
              {!editTx&&<>
                <label style={S.label}>Recurrencia</label>
                <select style={S.input} value={txForm.recurrence} onChange={e=>setTxForm(f=>({...f,recurrence:e.target.value}))}>
                  {RECURRENCE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {txForm.recurrence!=="none"&&<>
                  <label style={S.label}>Fecha de fin (opcional)</label>
                  <input style={S.input} type="date" value={txForm.recurrence_end} onChange={e=>setTxForm(f=>({...f,recurrence_end:e.target.value}))}/>
                  <div style={{background:"#eef2ff",color:"#4f46e5",borderRadius:8,padding:"8px 12px",fontSize:13,marginTop:10,fontWeight:500}}>↺ Se repetirá {recLabel[txForm.recurrence]?.toLowerCase()} {txForm.recurrence_end?`hasta el ${txForm.recurrence_end}`:"indefinidamente"}</div>
                </>}
              </>}
              <div style={{display:"flex",gap:10,marginTop:22}}>
                <button style={S.btnCancel} onClick={()=>{setViewPersist("transactions");setEditTx(null);}}>Cancelar</button>
                <button style={S.btnPrimary} onClick={submitTx}>{editTx?"Guardar cambios":"Agregar"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ RECURRENTS ══ */}
        {view==="recurrents" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            <div style={S.pageHeader}>
              <div><h1 style={S.pageTitle}>↺ Recurrentes</h1><p style={S.pageSub}>{recurrents.length} reglas activas</p></div>
              <button style={S.btnPrimary} onClick={()=>setViewPersist("add")}>+ Nuevo</button>
            </div>
            {recurrents.length===0&&<div style={{...S.card,textAlign:"center",padding:"48px"}}><p style={{fontSize:32,margin:0}}>↺</p><p style={{color:"#94a3b8",marginTop:8}}>Sin movimientos recurrentes</p><button style={{...S.btnPrimary,marginTop:12}} onClick={()=>setViewPersist("add")}>Crear movimiento</button></div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
              {[...recurrents].sort((a,b)=>a.next_date.localeCompare(b.next_date)).map(r=>{
                const isIng=r.type==="ingreso";
                return (
                  <div key={r.id} style={{...S.accCard,borderTop:`3px solid ${isIng?"#34d399":"#f87171"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontWeight:700,color:"#0f172a",fontSize:15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.description}</p><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{r.category}</p></div>
                      <div style={{display:"flex",gap:4,marginLeft:8}}>
                        <button style={S.iconBtn} onClick={()=>startEditRec(r)} title="Modificar">✎</button>
                        <button style={{...S.iconBtn,...S.iconBtnDel}} onClick={()=>deleteRecurrent(r.id)}>✕</button>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,marginBottom:8}}>
                      <span style={{display:"inline-block",padding:"3px 8px",borderRadius:6,fontSize:12,fontWeight:600,background:isIng?"#f0fdf4":"#fef2f2",color:isIng?"#059669":"#dc2626"}}>{isIng?"↑ Ingreso":"↓ Gasto"}</span>
                      <span style={{display:"inline-block",padding:"3px 8px",borderRadius:6,fontSize:12,fontWeight:600,background:"#eef2ff",color:"#4f46e5"}}>{recLabel[r.recurrence]}</span>
                    </div>
                    <p style={{margin:"0 0 10px",fontSize:22,fontWeight:700,color:isIng?"#059669":"#dc2626"}}>{isIng?"+":"-"}{fmx(r.amount)}</p>
                    <div style={{borderTop:"1px solid #f1f5f9",paddingTop:10,display:"flex",justifyContent:"space-between"}}>
                      <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Próxima fecha</p><p style={{margin:0,fontSize:14,color:"#1e293b",fontWeight:600}}>{r.next_date}</p></div>
                      {r.end_date&&<div style={{textAlign:"right"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Fecha fin</p><p style={{margin:0,fontSize:14,color:"#1e293b",fontWeight:600}}>{r.end_date}</p></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ BUDGETS ══ */}
        {view==="budgets" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            <div style={S.pageHeader}>
              <div><h1 style={S.pageTitle}>Presupuestos</h1><p style={S.pageSub}>Límites mensuales · {capFirst(new Date(selectedMonth+"-01T00:00:00").toLocaleDateString("es-ES",{month:"long",year:"numeric"}))}</p></div>
              <button style={S.btnPrimary} onClick={()=>{setBudgetForm({category:"",amount:""});setEditBudget(null);setModal("newBudget");}}>+ Nuevo</button>
            </div>
            <div style={{...S.card,marginBottom:16,background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",border:"1px solid #c7d2fe"}}>
              <h2 style={{...S.cardTitle,marginBottom:12}}>🗓 Límite mensual global</h2>
              {monthlyLimit?(
                <div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div><p style={{margin:0,fontSize:14,color:"#4f46e5"}}>Presupuesto total del mes</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:700,color:"#4f46e5"}}>{fmx(monthlyLimit.amount)}</p></div>
                    <button style={{...S.iconBtn,...S.iconBtnDel}} onClick={deleteMonthlyLimit}>✕</button>
                  </div>
                  {(()=>{
                    const todayStr2=today(); const spent=transactions.filter(t=>t.type==="gasto"&&t.category!=="Traspaso"&&t.date>=startOfSelMonth&&t.date<=endOfSelMonth&&t.date<=todayStr2).reduce((s,t)=>s+t.amount,0);
                    const pct=Math.min((spent/monthlyLimit.amount)*100,100);
                    const over=spent>monthlyLimit.amount;
                    const warn=pct>=80&&!over;
                    const barColor=over?"#ef4444":warn?"#f59e0b":"#4f46e5";
                    return (<div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:14,color:"#6b7280"}}>Gastado: <b style={{color:over?"#dc2626":"#1e293b"}}>{fmx(spent)}</b></span><span style={{fontSize:14,color:"#94a3b8"}}>{pct.toFixed(0)}%</span></div>
                      <div style={S.progTrack}><div style={{...S.progBar,width:`${pct}%`,background:`linear-gradient(90deg,${barColor},${barColor}99)`}}/></div>
                      <p style={{margin:"6px 0 0",fontSize:13,color:over?"#dc2626":warn?"#d97706":"#059669",fontWeight:600}}>{over?`⚠ Excedido en ${fmx(spent-monthlyLimit.amount)}`:warn?`⚡ Quedan solo ${fmx(monthlyLimit.amount-spent)}`:`✓ Disponible: ${fmx(monthlyLimit.amount-spent)}`}</p>
                    </div>);
                  })()}
                </div>
              ):(
                <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:180}}><label style={S.label}>Límite total del mes (€)</label><input style={S.input} type="number" placeholder="Ej. 2000" value={monthlyLimitForm} onChange={e=>setMonthlyLimitForm(e.target.value)}/></div>
                  <button style={{...S.btnPrimary,marginBottom:1}} onClick={saveMonthlyLimit}>Guardar</button>
                </div>
              )}
            </div>
            <div style={S.card}>
              <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
                {[{label:"Total presupuestado",val:fmx(budgetsWithSpent.reduce((s,b)=>s+b.amount,0)),color:"#4f46e5"},{label:"Total gastado",val:fmx(budgetsWithSpent.reduce((s,b)=>s+b.spent,0)),color:"#dc2626"},{label:"Disponible",val:fmx(budgetsWithSpent.reduce((s,b)=>s+(b.amount-b.spent),0)),color:"#059669"},{label:"Categorías",val:budgets.length,color:"#d97706"}].map(({label,val,color})=>(
                  <div key={label}><p style={{margin:0,fontSize:12,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color}}>{val}</p></div>
                ))}
              </div>
            </div>
            {budgets.length===0&&<div style={{...S.card,textAlign:"center",padding:"48px"}}><p style={{fontSize:32,margin:0}}>◎</p><p style={{color:"#94a3b8",marginTop:8}}>Sin presupuestos por categoría</p><button style={{...S.btnPrimary,marginTop:12}} onClick={()=>setModal("newBudget")}>Crear presupuesto</button></div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
              {budgetsWithSpent.map(b=>{
                const pct=Math.min((b.spent/b.amount)*100,100);
                const over=b.spent>b.amount, warn=pct>=80&&!over;
                const barColor=over?"#ef4444":warn?"#f59e0b":"#4f46e5";
                return (
                  <div key={b.id} style={{...S.budgetCard,borderTop:`3px solid ${barColor}`,cursor:"pointer"}} onClick={()=>setBudgetDetail(budgetDetail===b.category?null:b.category)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div><p style={{margin:0,fontWeight:700,color:"#0f172a",fontSize:15}}>{b.category}</p>{over&&<span style={S.badgeDanger}>⚠ Excedido</span>}{warn&&<span style={S.badgeWarn}>⚡ Queda poco</span>}</div>
                      <div style={{display:"flex",gap:4}}><button style={S.iconBtn} onClick={e=>{e.stopPropagation();startEditBudget(b);}}>✎</button><button style={{...S.iconBtn,...S.iconBtnDel}} onClick={e=>{e.stopPropagation();confirmDeleteBudget(b.id);}}>✕</button></div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"#64748b"}}>Gastado: <b style={{color:over?"#dc2626":"#1e293b"}}>{fmx(b.spent)}</b></span><span style={{fontSize:13,color:"#94a3b8"}}>Límite: {fmx(b.amount)}</span></div>
                    <div style={S.progTrack}><div style={{...S.progBar,width:`${pct}%`,background:`linear-gradient(90deg,${barColor},${barColor}99)`}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:12,color:"#94a3b8"}}>{pct.toFixed(0)}% usado</span><span style={{fontSize:12,color:over?"#dc2626":"#059669"}}>{over?`-${fmx(b.spent-b.amount)} excedido`:`${fmx(b.amount-b.spent)} libre`}</span></div>
                  </div>
                );
              })}
            </div>
            {budgetDetail && (
              <div style={{...S.card,marginTop:16,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <h2 style={S.cardTitle}>Movimientos: {budgetDetail}</h2>
                  <button style={S.linkBtn} onClick={()=>setBudgetDetail(null)}>✕ Cerrar</button>
                </div>
                {(()=>{
                  const todayStr=today();
                  const txs=transactions.filter(t=>t.type==="gasto"&&t.category===budgetDetail&&t.date>=startOfSelMonth&&t.date<=endOfSelMonth&&t.date<=todayStr);
                  return txs.length===0
                    ? <p style={S.empty}>Sin movimientos en este período</p>
                    : txs.sort((a,b)=>b.date.localeCompare(a.date)).map(t=><TxRow key={t.id} t={t} accounts={accounts} onEdit={startEditTx} onDelete={confirmDeleteTx} showBalance={false}/>);
                })()}
              </div>
            )}
          </div>
        )}

        {/* ══ STOCK HISTORY ══ */}
        {view==="stockhistory" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            <h1 style={S.pageTitle}>📊 Historial de bolsa</h1>
            <p style={S.pageSub}>Operaciones cerradas (con fecha de venta)</p>
            {stocksWithValue.filter(s=>s.sell_date).length===0&&<div style={{...S.card,textAlign:"center",padding:"48px"}}><p style={{fontSize:32,margin:0}}>📊</p><p style={{color:"#94a3b8",marginTop:8}}>Sin operaciones cerradas aún</p></div>}
            {stocksWithValue.filter(s=>s.sell_date).length>0&&(()=>{
              const closed=stocksWithValue.filter(s=>s.sell_date);
              const totalInv=closed.reduce((s,p)=>s+p.invested,0);
              const totalSold=closed.reduce((s,p)=>s+(p.sell_price||0)*p.quantity,0);
              const totalGain=totalSold-totalInv;
              return (<>
                <div style={{...S.card,background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:"1px solid #bbf7d0",marginBottom:16}}>
                  <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Total invertido</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#1e293b"}}>{fmx(totalInv)}</p></div>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Total recuperado</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#059669"}}>{fmx(totalSold)}</p></div>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Resultado total</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:totalGain>=0?"#059669":"#dc2626"}}>{totalGain>=0?"+":""}{fmx(totalGain)}</p></div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
                  {closed.map(s=>{
                    const soldValue=(s.sell_price||0)*s.quantity;
                    return (
                      <div key={s.id} style={{...S.accCard,borderTop:`3px solid ${s.gain>=0?"#059669":"#dc2626"}`,opacity:0.9}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <div><p style={{margin:0,fontWeight:700,color:"#0f172a",fontSize:15}}>{s.name}</p><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{s.ticker||""} · {s.quantity} acciones</p></div>
                          <button style={{...S.iconBtn,...S.iconBtnDel}} onClick={()=>deleteStock(s.id)}>✕</button>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                          <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Compra</p><p style={{margin:0,fontSize:13,fontWeight:600}}>{fmx(s.buy_price)}</p><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{s.buy_date}</p></div>
                          <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Venta</p><p style={{margin:0,fontSize:13,fontWeight:600}}>{fmx(s.sell_price||0)}</p><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{s.sell_date}</p></div>
                        </div>
                        <div style={{background:s.gain>=0?"#f0fdf4":"#fef2f2",borderRadius:8,padding:"8px 10px",display:"flex",justifyContent:"space-between"}}>
                          <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Invertido</p><p style={{margin:0,fontSize:14,fontWeight:600}}>{fmx(s.invested)}</p></div>
                          <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Resultado</p><p style={{margin:0,fontSize:15,fontWeight:700,color:s.gain>=0?"#059669":"#dc2626"}}>{s.gain>=0?"+":""}{fmx(s.gain)} ({s.gainPct>=0?"+":""}{s.gainPct.toFixed(1)}%)</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>);
            })()}
          </div>
        )}

        {/* ══ PROPERTIES ══ */}
        {view==="properties" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            <div style={S.pageHeader}>
              <div><h1 style={S.pageTitle}>Inmuebles</h1><p style={S.pageSub}>{properties.length} inmuebles registrados</p></div>
              <button style={S.btnPrimary} onClick={()=>{setPropForm({name:"",address:"",size_m2:"",year_built:"",buy_price:"",buy_date:today(),cadastral_value:"",estimated_price:"",participation:100});setEditProp(null);setModal("newProp");}}>+ Nuevo</button>
            </div>
            {properties.length>0&&(()=>{
              const totalBuy=properties.reduce((s,p)=>s+p.buy_price*(p.participation||100)/100,0);
              const totalEst=properties.reduce((s,p)=>s+(p.estimated_price||p.buy_price)*(p.participation||100)/100,0);
              const totalGain=totalEst-totalBuy;
              const gainPct=totalBuy>0?((totalGain/totalBuy)*100):0;
              return (
                <div style={{...S.card,background:"linear-gradient(135deg,#eff6ff,#dbeafe)",border:"1px solid #bfdbfe",marginBottom:16}}>
                  <h2 style={{...S.cardTitle,color:"#1d4ed8"}}>Resumen inmuebles</h2>
                  <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Inversión total (tu parte)</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#1d4ed8"}}>{fmx(totalBuy)}</p></div>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Valor estimado</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#059669"}}>{fmx(totalEst)}</p></div>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Plusvalía estimada</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:totalGain>=0?"#059669":"#dc2626"}}>{fmx(totalGain)} ({gainPct>=0?"+":""}{gainPct.toFixed(1)}%)</p></div>
                  </div>
                </div>
              );
            })()}
            {properties.length===0&&<div style={{...S.card,textAlign:"center",padding:"48px"}}><p style={{fontSize:32,margin:0}}>⌂</p><p style={{color:"#94a3b8",marginTop:8}}>Sin inmuebles registrados</p><button style={{...S.btnPrimary,marginTop:12}} onClick={()=>setModal("newProp")}>Añadir inmueble</button></div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
              {properties.map(p=>{
                const part=(p.participation||100)/100;
                const estPrice=(p.estimated_price||p.buy_price)*part;
                const myBuyPrice=p.buy_price*part;
                const gain=estPrice-myBuyPrice;
                const gainPct=((gain/myBuyPrice)*100);
                const years=((new Date()-new Date(p.buy_date+"T00:00:00"))/(1000*60*60*24*365));
                const annualReturn=gainPct/Math.max(years,0.1);
                return (
                  <div key={p.id} style={{...S.accCard,borderTop:"3px solid #3b82f6"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontWeight:700,color:"#0f172a",fontSize:16,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>⌂ {p.name}</p>
                        {p.address&&<p style={{margin:0,fontSize:12,color:"#94a3b8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.address}</p>}
                        <span style={{display:"inline-block",background:(p.participation||100)===50?"#eff6ff":"#f0fdf4",color:(p.participation||100)===50?"#3b82f6":"#059669",fontSize:12,padding:"2px 7px",borderRadius:5,fontWeight:700,marginTop:2}}>{p.participation||100}%</span>
                      </div>
                      <div style={{display:"flex",gap:4,marginLeft:8}}>
                        <button style={S.iconBtn} onClick={()=>startEditProp(p)}>✎</button>
                        <button style={{...S.iconBtn,...S.iconBtnDel}} onClick={()=>confirmDeleteProp(p.id)}>✕</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      {p.size_m2&&<div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Superficie</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#1e293b"}}>{p.size_m2} m²</p></div>}
                      {p.year_built&&<div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Año construcción</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#1e293b"}}>{p.year_built}</p></div>}
                      <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Precio compra ({p.participation||100}%)</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#1e293b"}}>{fmx(myBuyPrice)}</p><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{p.buy_date}</p></div>
                      {p.cadastral_value&&<div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Valor catastral</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#1e293b"}}>{fmx(p.cadastral_value)}</p></div>}
                    </div>
                    <div style={{background:gain>=0?"#f0fdf4":"#fef2f2",borderRadius:10,padding:"10px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Valor estimado ({p.participation||100}%)</p><p style={{margin:0,fontSize:18,fontWeight:700,color:gain>=0?"#059669":"#dc2626"}}>{fmx(estPrice)}</p></div>
                        <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Plusvalía</p><p style={{margin:0,fontSize:15,fontWeight:700,color:gain>=0?"#059669":"#dc2626"}}>{gain>=0?"+":""}{fmx(gain)}</p><p style={{margin:0,fontSize:12,color:gain>=0?"#059669":"#dc2626"}}>{gainPct>=0?"+":""}{gainPct.toFixed(1)}% · {annualReturn.toFixed(1)}%/año</p></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ DEBTS ══ */}
        {view==="debts" && (
          <div style={{...S.page,padding:isMobile?"16px 14px 20px":"32px 36px",paddingTop:isMobile?"48px":"32px"}}>
            <div style={S.pageHeader}>
              <div><h1 style={S.pageTitle}>Deudas</h1><p style={S.pageSub}>{debts.length} deudas registradas</p></div>
              <button style={S.btnPrimary} onClick={()=>{setDebtForm({name:"",total_amount:"",monthly_payment:"",start_date:today(),end_date:"",participation:100,interest_rate:""});setEditDebt(null);setModal("newDebt");}}>+ Nueva deuda</button>
            </div>
            {debts.length>0&&(()=>{
              const totalDebt=debts.reduce((s,d)=>s+(d.total_amount*d.participation/100),0);
              const totalMonthly=debts.reduce((s,d)=>s+(d.monthly_payment*d.participation/100),0);
              const maxEnd=debts.reduce((a,d)=>d.end_date>a?d.end_date:a,"");
              const totalPending=debts.reduce((s,d)=>{
                const myMonthly=d.monthly_payment*d.participation/100;
                const start=new Date(d.start_date+"T00:00:00");
                const end=new Date(d.end_date+"T00:00:00");
                const elapsed=Math.max(0,Math.round((new Date()-start)/(1000*60*60*24*30)));
                const totalMonths=Math.max(1,Math.round((end-start)/(1000*60*60*24*30)));
                const remainingMonths=Math.max(0,totalMonths-elapsed);
                let remaining;
                if(d.interest_rate&&d.interest_rate>0){
                  const tae=d.interest_rate/100;
                  const mRate=Math.pow(1+tae,1/12)-1;
                  remaining=remainingMonths>0?myMonthly*((1-Math.pow(1+mRate,-remainingMonths))/mRate):0;
                } else {
                  remaining=Math.max(0,d.total_amount*d.participation/100-myMonthly*elapsed);
                }
                return s+remaining;
              },0);
              return (
                <div style={{...S.card,background:"linear-gradient(135deg,#fef2f2,#fee2e2)",border:"1px solid #fecaca",marginBottom:16}}>
                  <h2 style={{...S.cardTitle,color:"#dc2626"}}>Resumen de deudas</h2>
                  <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Total deuda (tu parte)</p><p style={{margin:"4px 0 0",fontSize:24,fontWeight:700,color:"#dc2626"}}>{fmx(totalDebt)}</p></div>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Pendiente aprox.</p><p style={{margin:"4px 0 0",fontSize:22,fontWeight:700,color:"#dc2626"}}>{fmx(totalPending)}</p></div>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Pago mensual (tu parte)</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#d97706"}}>{fmx(totalMonthly)}</p></div>
                    <div><p style={{margin:0,fontSize:12,color:"#64748b",textTransform:"uppercase"}}>Última cuota</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:"#64748b"}}>{maxEnd}</p></div>
                  </div>
                </div>
              );
            })()}
            {debts.length===0&&<div style={{...S.card,textAlign:"center",padding:"48px"}}><p style={{fontSize:32,margin:0}}>⊗</p><p style={{color:"#94a3b8",marginTop:8}}>Sin deudas registradas</p><button style={{...S.btnPrimary,marginTop:12}} onClick={()=>setModal("newDebt")}>Añadir deuda</button></div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
              {debts.map(d=>{
                const myAmt=d.total_amount*d.participation/100;
                const myMonthly=d.monthly_payment*d.participation/100;
                const start=new Date(d.start_date+"T00:00:00");
                const end=new Date(d.end_date+"T00:00:00");
                const today2=new Date();
                const totalMonths=Math.max(1,Math.round((end-start)/(1000*60*60*24*30)));
                const elapsedMonths=Math.max(0,Math.round((today2-start)/(1000*60*60*24*30)));
                const pct=Math.min((elapsedMonths/totalMonths)*100,100);
                let remaining;
                if(d.interest_rate&&d.interest_rate>0){
                  const tae=d.interest_rate/100;
                  const mRate=Math.pow(1+tae,1/12)-1;
                  const remMonths=Math.max(0,totalMonths-elapsedMonths);
                  remaining=remMonths>0?myMonthly*((1-Math.pow(1+mRate,-remMonths))/mRate):0;
                } else {
                  remaining=Math.max(0,myAmt-myMonthly*elapsedMonths);
                }
                return (
                  <div key={d.id} style={{...S.accCard,borderTop:"3px solid #dc2626"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div><p style={{margin:0,fontWeight:700,color:"#0f172a",fontSize:16}}>{d.name}</p><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>{d.participation}% de participación{d.interest_rate?` · TAE ${d.interest_rate}%`:""}</p></div>
                      <div style={{display:"flex",gap:4}}>
                        <button style={S.iconBtn} onClick={()=>startEditDebt(d)}>✎</button>
                        <button style={{...S.iconBtn,...S.iconBtnDel}} onClick={()=>confirmDeleteDebt(d.id)}>✕</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Deuda total</p><p style={{margin:0,fontSize:15,fontWeight:700,color:"#dc2626"}}>{fmx(d.total_amount)}</p></div>
                      <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Tu parte ({d.participation}%)</p><p style={{margin:0,fontSize:15,fontWeight:700,color:"#dc2626"}}>{fmx(myAmt)}</p></div>
                      <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Pago mensual total</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#d97706"}}>{fmx(d.monthly_payment)}</p></div>
                      <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Tu pago mensual</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#d97706"}}>{fmx(myMonthly)}</p></div>
                    </div>
                    <div style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#64748b"}}>Progreso</span><span style={{fontSize:12,color:"#64748b"}}>{pct.toFixed(0)}%</span></div>
                      <div style={S.progTrack}><div style={{...S.progBar,width:`${pct}%`,background:"linear-gradient(90deg,#dc2626,#f87171)"}}/></div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #f1f5f9",paddingTop:10}}>
                      <div><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Pendiente aprox.</p><p style={{margin:0,fontSize:14,fontWeight:700,color:"#dc2626"}}>{fmx(remaining)}</p></div>
                      <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:12,color:"#94a3b8"}}>Fecha fin</p><p style={{margin:0,fontSize:14,fontWeight:600,color:"#64748b"}}>{d.end_date}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TxRow({ t, accounts, onEdit, onDelete, showBalance }) {
  const isIng=t.type==="ingreso";
  const acc=accounts.find(a=>a.id===t.account_id);
  const isRec=t.recurrence&&t.recurrence!=="none";
  return (
    <div style={styles.txRow}>
      <div style={{...styles.txDot,background:isIng?"#34d399":"#f87171"}}/>
      <div style={styles.txInfo}>
        <span style={styles.txDesc}>{t.description}{isRec&&<span style={{fontSize:12,color:"#4f46e5",marginLeft:6,fontWeight:600}}>↺</span>}</span>
        <span style={styles.txMeta}>{t.category} · {t.date}{acc?` · ${acc.icon} ${acc.name}`:""}</span>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <span style={{...styles.txAmount,color:isIng?"#059669":"#dc2626",display:"block"}}>{isIng?"+":"-"}{new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(t.amount)}</span>
        {showBalance&&t.runningBalance!==null&&t.runningBalance!==undefined&&<span style={{fontSize:12,color:"#94a3b8"}}>Saldo: {new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(t.runningBalance)}</span>}
      </div>
      <div style={styles.txActions}>
        <button style={styles.iconBtn} onClick={()=>onEdit(t)}>✎</button>
        <button style={{...styles.iconBtn,...styles.iconBtnDel}} onClick={()=>onDelete(t.id)}>✕</button>
      </div>
    </div>
  );
}

const styles = {
  root:{display:"flex",minHeight:"100vh",background:"#f8fafc",color:"#1e293b",fontFamily:"'DM Sans','Segoe UI',sans-serif"},
  sidebar:{width:222,background:"#ffffff",display:"flex",flexDirection:"column",padding:"24px 14px",position:"fixed",top:0,left:0,height:"100vh",flexShrink:0,borderRight:"1px solid #e2e8f0",boxShadow:"2px 0 8px rgba(0,0,0,.06)",zIndex:100,overflowY:"auto"},
  logo:{display:"flex",alignItems:"center",gap:10,marginBottom:32},
  logoIcon:{fontSize:24,color:"#4f46e5"},
  logoText:{fontSize:15,fontWeight:700,letterSpacing:"0.03em",color:"#1e293b"},
  nav:{display:"flex",flexDirection:"column",gap:3},
  navBtn:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontSize:14,fontWeight:500,textAlign:"left",transition:"all .15s"},
  navBtnActive:{background:"#eef2ff",color:"#4f46e5"},
  navIcon:{fontSize:16,width:18,textAlign:"center"},
  exportSideBtn:{marginTop:12,background:"#f8fafc",border:"1px solid #e2e8f0",color:"#64748b",borderRadius:10,padding:"9px 14px",cursor:"pointer",fontSize:14,fontWeight:500},
  sidebalBox:{marginTop:"auto",marginBottom:28,background:"#f8fafc",borderRadius:12,padding:"14px",border:"1px solid #e2e8f0"},
  sidebalLabel:{fontSize:12,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",margin:0},
  sidebalAmt:{fontSize:19,fontWeight:700,margin:"4px 0 0"},
  main:{flex:1,overflowY:"auto",background:"#f8fafc",minWidth:0,width:"100%"},
  page:{padding:"32px 36px",maxWidth:1100,margin:"0 auto",boxSizing:"border-box",width:"100%"},
  pageTitle:{fontSize:24,fontWeight:700,margin:0,color:"#0f172a"},
  pageSub:{color:"#94a3b8",marginTop:4,marginBottom:24,fontSize:14},
  pageHeader:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10},
  card:{background:"#ffffff",borderRadius:16,padding:"20px 22px",marginBottom:16,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,.04)"},
  accCard:{background:"#ffffff",borderRadius:14,padding:"16px 18px",border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,.04)"},
  budgetCard:{background:"#ffffff",borderRadius:14,padding:"16px 18px",border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,.04)"},
  cardTitle:{fontSize:15,fontWeight:600,color:"#475569",marginTop:0,marginBottom:14},
  catRow:{marginBottom:10},
  catInfo:{display:"flex",justifyContent:"space-between",marginBottom:4},
  catName:{fontSize:14,color:"#334155"},
  catVal:{fontSize:14,color:"#64748b"},
  progTrack:{height:5,background:"#f1f5f9",borderRadius:3},
  progBar:{height:"100%",background:"linear-gradient(90deg,#4f46e5,#818cf8)",borderRadius:3,transition:"width .4s"},
  txRow:{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:"1px solid #f1f5f9"},
  txDot:{width:9,height:9,borderRadius:"50%",flexShrink:0},
  txInfo:{flex:1,minWidth:0},
  txDesc:{display:"block",fontSize:14,color:"#1e293b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  txMeta:{fontSize:12,color:"#94a3b8"},
  txAmount:{fontSize:15,fontWeight:600},
  txActions:{display:"flex",gap:4},
  iconBtn:{background:"#f8fafc",border:"1px solid #e2e8f0",color:"#64748b",width:27,height:27,borderRadius:7,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"},
  iconBtnDel:{color:"#dc2626",borderColor:"#fecaca"},
  search:{background:"#f8fafc",border:"1px solid #e2e8f0",color:"#1e293b",borderRadius:10,padding:"8px 14px",fontSize:14,outline:"none"},
  tabs:{display:"flex",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0",overflow:"hidden"},
  tab:{background:"none",border:"none",color:"#64748b",padding:"8px 12px",cursor:"pointer",fontSize:13},
  tabActive:{background:"#eef2ff",color:"#4f46e5",fontWeight:600},
  empty:{color:"#94a3b8",textAlign:"center",padding:"24px 0",fontSize:14},
  label:{display:"block",fontSize:12,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5,marginTop:14},
  input:{width:"100%",background:"#f8fafc",border:"1px solid #e2e8f0",color:"#1e293b",borderRadius:10,padding:"10px 13px",fontSize:14,outline:"none",boxSizing:"border-box"},
  btnPrimary:{background:"#4f46e5",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:600,cursor:"pointer",fontSize:14},
  btnSecondary:{background:"#f8fafc",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:14,fontWeight:500},
  btnCancel:{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:10,padding:"10px 18px",cursor:"pointer",fontSize:14},
  btnDanger:{background:"#ef4444",color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",fontWeight:600,cursor:"pointer",fontSize:14},
  overlay:{position:"fixed",inset:0,background:"rgba(15,23,42,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99},
  modal:{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:18,padding:"26px 28px",minWidth:300,maxWidth:440,width:"90%",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.12)"},
  modalTitle:{fontSize:18,fontWeight:700,margin:"0 0 6px",color:"#0f172a"},
  modalSub:{fontSize:14,color:"#94a3b8",margin:"0 0 18px"},
  modalBtns:{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20},
  exportBtn:{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,cursor:"pointer",color:"#1e293b",textAlign:"left",width:"100%",fontSize:15,fontWeight:600},
  toast:{position:"fixed",top:18,right:18,color:"#fff",padding:"11px 20px",borderRadius:12,fontWeight:600,fontSize:14,zIndex:999,boxShadow:"0 8px 24px rgba(0,0,0,.15)"},
  badgeDanger:{display:"inline-block",background:"#fef2f2",color:"#dc2626",fontSize:12,padding:"2px 7px",borderRadius:5,fontWeight:600,marginTop:2},
  badgeWarn:{display:"inline-block",background:"#fffbeb",color:"#d97706",fontSize:12,padding:"2px 7px",borderRadius:5,fontWeight:600,marginTop:2},
  linkBtn:{background:"none",border:"none",color:"#4f46e5",cursor:"pointer",fontSize:13},
};
