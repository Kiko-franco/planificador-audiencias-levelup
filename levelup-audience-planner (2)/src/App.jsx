import React, { useMemo, useState } from "react";

const BRAND = {
  name: "levelUp",
  tagline: "Advertising Solutions",
  app: "Audience Planner",
  logoPath: "/levelup-logo.png",
};

const DEFAULT_BENCHMARKS = {
  baseAudience: 1000000,
  age: { "18-24": 0.22, "25-40": 0.35, "40-55": 0.27, "55+": 0.16 },
  gender: { Hombres: 0.5, Mujeres: 0.5, Todos: 1 },
  interest: {
    Gaming: 0.2,
    "Tecnología": 0.28,
    "Electrodomésticos": 0.18,
    Hogar: 0.16,
    "Foto/Vídeo": 0.12,
    Movilidad: 0.14,
  },
  location: { España: 0.6, Portugal: 0.08, "UE (resto)": 0.22, LATAM: 0.1 },
  channels: { retailMedia: 0.6, socialAds: 0.7, display: 0.5, email: 0.3 },
  pricing: {
    assumedCPM: { retailMedia: 6, socialAds: 5, display: 4, email: 1 },
    minFrequency: 2,
  },
};

function clampInt(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}
function formatInt(n) {
  return clampInt(n).toLocaleString("es-ES");
}
function estimateMinBudget({ reach, cpm, minFrequency }) {
  const impressions = reach * minFrequency;
  return (impressions / 1000) * cpm;
}

export default function App() {
  const [tab, setTab] = useState("planner");
  const [toast, setToast] = useState("");

  const [adminPass, setAdminPass] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [clients] = useState([
    { id: "c1", name: "Cliente Demo A", industry: "Electrónica" },
    { id: "c2", name: "Cliente Demo B", industry: "Gaming" },
  ]);
  const [selectedClient, setSelectedClient] = useState("c2");

  const [bench, setBench] = useState(DEFAULT_BENCHMARKS);

  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [interest, setInterest] = useState("");
  const [location, setLocation] = useState("");

  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);

  const segmentLabel = useMemo(() => {
    const parts = [
      ageRange ? `Edad ${ageRange}` : null,
      gender || null,
      interest ? `Interés: ${interest}` : null,
      location ? `Ubicación: ${location}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "(sin segmentación)";
  }, [ageRange, gender, interest, location]);

  const calc = () => {
    const base = bench.baseAudience;
    const mAge = ageRange ? bench.age[ageRange] ?? 1 : 1;
    const mGender = gender ? bench.gender[gender] ?? 1 : 1;
    const mInterest = interest ? bench.interest[interest] ?? 1 : 1;
    const mLoc = location ? bench.location[location] ?? 1 : 1;

    const modifier = mAge * mGender * mInterest * mLoc;
    const total = clampInt(base * modifier);

    const reach = {
      retailMedia: clampInt(total * bench.channels.retailMedia),
      socialAds: clampInt(total * bench.channels.socialAds),
      display: clampInt(total * bench.channels.display),
      email: clampInt(total * bench.channels.email),
    };

    const minFrequency = bench.pricing.minFrequency;
    const cpm = bench.pricing.assumedCPM;

    const minBudget = {
      retailMedia: estimateMinBudget({ reach: reach.retailMedia, cpm: cpm.retailMedia, minFrequency }),
      socialAds: estimateMinBudget({ reach: reach.socialAds, cpm: cpm.socialAds, minFrequency }),
      display: estimateMinBudget({ reach: reach.display, cpm: cpm.display, minFrequency }),
      email: estimateMinBudget({ reach: reach.email, cpm: cpm.email, minFrequency }),
    };

    setResult({ total, reach, minBudget, modifier });
    setToast("Audiencia calculada ✅");
    setTab("planner");
  };

  const client = useMemo(() => clients.find(c => c.id === selectedClient), [clients, selectedClient]);

  const proposalText = useMemo(() => {
    if (!result) return "";
    const lines = [];
    lines.push(`${BRAND.name} · ${BRAND.app}`);
    lines.push("--------------------------------");
    if (client) lines.push(`Cliente: ${client.name}${client.industry ? ` (${client.industry})` : ""}`);
    lines.push(`Target: ${segmentLabel}`);
    lines.push(`Audiencia potencial estimada: ${formatInt(result.total)}`);
    lines.push("");
    lines.push("Alcance estimado por canal (audiencia alcanzable):");
    lines.push(`- Retail Media: ${formatInt(result.reach.retailMedia)} (budget min aprox: €${formatInt(result.minBudget.retailMedia)})`);
    lines.push(`- Social Ads: ${formatInt(result.reach.socialAds)} (budget min aprox: €${formatInt(result.minBudget.socialAds)})`);
    lines.push(`- Display: ${formatInt(result.reach.display)} (budget min aprox: €${formatInt(result.minBudget.display)})`);
    lines.push(`- Email: ${formatInt(result.reach.email)} (budget min aprox: €${formatInt(result.minBudget.email)})`);
    lines.push("");
    lines.push(`Suposiciones: baseAudience=${formatInt(bench.baseAudience)}, frecuencia mínima=${minFrequency}, multiplicador final=${result.modifier.toFixed(4)}`);
    if (notes?.trim()) {
      lines.push("");
      lines.push("Notas comerciales:");
      lines.push(notes.trim());
    }
    return lines.join("\n");
  }, [result, client, segmentLabel, notes, bench.baseAudience, bench.pricing.minFrequency]);

  const copy = async () => {
    if (!proposalText) { setToast("Primero calcula una audiencia en Planner."); return; }
    try {
      await navigator.clipboard.writeText(proposalText);
      setToast("Copiado al portapapeles ✅");
    } catch {
      setToast("No pude copiar 😅 Selecciona el texto y copia manual.");
    }
  };

  const tryAdminLogin = () => {
    if (adminPass === "levelup") {
      setIsAdmin(true);
      setToast("Modo Admin activado ✅");
    } else {
      setToast("Clave incorrecta. Pista: en el MVP es 'levelup'.");
    }
  };

  return (
    <>
      <div className="header">
        <div className="header-inner">
          <div className="brand">
            <img src={BRAND.logoPath} alt="levelUp logo" />
            <div>
              <div className="title">{BRAND.name} <span style={{color:"#9ca3af"}}>/</span> {BRAND.app}</div>
              <div className="subtitle">{BRAND.tagline}</div>
            </div>
          </div>

          <div className="row" style={{justifyContent:"flex-end"}}>
            <div className="small">Cliente</div>
            <select value={selectedClient} onChange={(e)=>setSelectedClient(e.target.value)} style={{padding:"8px 10px", borderRadius:"999px"}}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn secondary" onClick={() => { setAgeRange(""); setGender(""); setInterest(""); setLocation(""); setNotes(""); setResult(null); }}>
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <h1 className="h1">Audience Planning, pero sin humo</h1>
        <p className="p">Seleccionas target → estimamos audiencia potencial + alcance por canal + inversión mínima.</p>

        {toast ? (
          <div className="toast">
            <span style={{fontSize:13}}>{toast}</span>
            <button className="btn secondary" onClick={()=>setToast("")} style={{padding:"8px 10px"}}>Cerrar</button>
          </div>
        ) : null}

        <div className="tabs">
          <button className={`tab ${tab==="planner" ? "active":""}`} onClick={()=>setTab("planner")}>Planner</button>
          <button className={`tab ${tab==="export" ? "active":""}`} onClick={()=>setTab("export")}>Export</button>
          <button className={`tab ${tab==="admin" ? "active":""}`} onClick={()=>setTab("admin")}>Admin</button>
        </div>

        {tab === "planner" && (
          <div className="grid grid-2" style={{marginTop:16}}>
            <div className="card pad">
              <div className="row" style={{justifyContent:"space-between"}}>
                <div>
                  <h2 style={{margin:"0 0 4px", fontSize:18, fontWeight:900}}>Target selector</h2>
                  <div className="small">MVP con benchmarks editables (Admin).</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="label">Base audience</div>
                  <div style={{fontWeight:900, fontSize:18}}>{formatInt(bench.baseAudience)}</div>
                </div>
              </div>

              <div className="grid grid-2" style={{marginTop:12}}>
                <div>
                  <div className="label">Rango de edad</div>
                  <select value={ageRange} onChange={(e)=>setAgeRange(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {Object.keys(bench.age).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div>
                  <div className="label">Género</div>
                  <select value={gender} onChange={(e)=>setGender(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {Object.keys(bench.gender).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div>
                  <div className="label">Interés</div>
                  <select value={interest} onChange={(e)=>setInterest(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {Object.keys(bench.interest).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div>
                  <div className="label">Ubicación</div>
                  <select value={location} onChange={(e)=>setLocation(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {Object.keys(bench.location).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div className="row" style={{marginTop:14}}>
                <button className="btn" onClick={calc} style={{minWidth:220}}>Calcular audiencia</button>
                <div className="small">Target: <b style={{color:"#111827"}}>{segmentLabel}</b></div>
              </div>
            </div>

            <div className="kpis">
              <div className="card pad">
                <div className="kpi-title">Audiencia potencial estimada</div>
                <div className="kpi-value">{result ? formatInt(result.total) : "—"}</div>
                <div className="small">Multiplicador final: {result ? result.modifier.toFixed(4) : "—"}</div>
              </div>

              <div className="card pad">
                <div style={{fontWeight:900, marginBottom:8}}>Desglose por canal</div>
                <table className="table">
                  <tbody>
                    <tr><td>Retail Media</td><td>{result ? formatInt(result.reach.retailMedia) : "—"}</td></tr>
                    <tr><td>Social Ads</td><td>{result ? formatInt(result.reach.socialAds) : "—"}</td></tr>
                    <tr><td>Display</td><td>{result ? formatInt(result.reach.display) : "—"}</td></tr>
                    <tr><td>Email</td><td>{result ? formatInt(result.reach.email) : "—"}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="card pad">
                <div style={{fontWeight:900, marginBottom:6}}>Inversión mínima sugerida (aprox)</div>
                <div className="small" style={{marginBottom:8}}>
                  Basado en CPM asumido y frecuencia mínima ({bench.pricing.minFrequency}).
                </div>
                <table className="table">
                  <tbody>
                    <tr><td>Retail Media</td><td>{result ? `€${formatInt(result.minBudget.retailMedia)}` : "—"}</td></tr>
                    <tr><td>Social Ads</td><td>{result ? `€${formatInt(result.minBudget.socialAds)}` : "—"}</td></tr>
                    <tr><td>Display</td><td>{result ? `€${formatInt(result.minBudget.display)}` : "—"}</td></tr>
                    <tr><td>Email</td><td>{result ? `€${formatInt(result.minBudget.email)}` : "—"}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "export" && (
          <div className="card pad" style={{marginTop:16}}>
            <div className="row" style={{justifyContent:"space-between"}}>
              <div>
                <h2 style={{margin:"0 0 4px", fontSize:18, fontWeight:900}}>Export listo para propuesta</h2>
                <div className="small">Texto para pegar en email / deck.</div>
              </div>
              <button className="btn secondary" onClick={copy}>Copiar</button>
            </div>

            <div className="grid grid-2" style={{marginTop:12}}>
              <div>
                <div className="label">Notas comerciales</div>
                <input className="input" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Ej: activar Retail Media + Social para cobertura incremental." />
                <div className="small" style={{marginTop:8}}>Tip: mete condiciones y ya sale en el export.</div>
              </div>

              <div>
                <div className="label">Texto generado</div>
                <pre style={{background:"#f3f4f6", padding:14, borderRadius:16, border:"1px solid var(--border)", minHeight:180}}>
{proposalText || "Calcula una audiencia en Planner para generar el resumen."}
                </pre>
              </div>
            </div>
          </div>
        )}

        {tab === "admin" && (
          <div className="grid grid-2" style={{marginTop:16}}>
            <div className="card pad">
              <h2 style={{margin:"0 0 6px", fontSize:18, fontWeight:900}}>Admin</h2>
              <div className="small">Clave MVP: <b>levelup</b>.</div>

              {!isAdmin ? (
                <div style={{marginTop:12}}>
                  <div className="label">Clave</div>
                  <input className="input" type="password" value={adminPass} onChange={(e)=>setAdminPass(e.target.value)} placeholder="Introduce la clave" />
                  <div style={{marginTop:10}}>
                    <button className="btn" onClick={tryAdminLogin} style={{width:"100%"}}>Entrar</button>
                  </div>
                </div>
              ) : (
                <div style={{marginTop:12}}>
                  <div className="small">✅ Admin activo</div>

                  <div className="grid grid-2" style={{marginTop:12}}>
                    <div>
                      <div className="label">Base Audience</div>
                      <input
                        className="input"
                        value={String(bench.baseAudience)}
                        onChange={(e)=>setBench(b=>({...b, baseAudience: clampInt(Number(e.target.value))}))}
                      />
                    </div>
                    <div>
                      <div className="label">Frecuencia mínima</div>
                      <input
                        className="input"
                        value={String(bench.pricing.minFrequency)}
                        onChange={(e)=>setBench(b=>({...b, pricing:{...b.pricing, minFrequency: Math.max(1, clampInt(Number(e.target.value)))}}))}
                      />
                    </div>
                  </div>

                  <div className="small" style={{marginTop:12}}>
                    (MVP) Cambios guardan en memoria del navegador. Para persistir: conectar DB (Airtable) en fase 2.
                  </div>

                  <div style={{marginTop:10}}>
                    <button className="btn secondary" onClick={()=>{setIsAdmin(false); setAdminPass(""); setToast("Modo Admin desactivado.");}} style={{width:"100%"}}>
                      Salir
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="card pad">
              <div style={{fontWeight:900, marginBottom:8}}>Nota importante</div>
              <div className="small">
                Este MVP funciona perfecto como web interna. Para que los datos se guarden entre sesiones y podáis gestionar
                clientes/benchmarks sin tocar código: fase 2 con Airtable.
              </div>
            </div>
          </div>
        )}

        <div className="footer">
          © {new Date().getFullYear()} {BRAND.name}. Estimaciones basadas en benchmarks y supuestos.
        </div>
      </div>
    </>
  );
}
