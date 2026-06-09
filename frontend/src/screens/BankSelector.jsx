import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "../components/Phone.jsx";
import { useFlow } from "../flow.jsx";
import { api } from "../api.js";
import * as I from "../icons.jsx";

export default function BankSelector() {
  const nav = useNavigate();
  const flow = useFlow();
  const [banks, setBanks] = useState([]);
  const [count, setCount] = useState(0);
  const [sel, setSel] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!flow.applicationId) { nav("/apply"); return; }
    api.getBanks().then((d) => { setBanks(d.banks); setCount(d.count); }).catch((e) => setErr(e.message));
  }, []);

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const filtered = banks.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));

  async function next() {
    setLoading(true); setErr(null);
    try {
      const { consents } = await api.selectBanks(flow.applicationId, sel);
      const selectedBanks = banks.filter((b) => sel.includes(b.id));
      flow.update({ selectedBanks, queue: consents, consents });
      nav(`/consent/${consents[0]}/sca`);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <Phone>
      <div className="appbar">
        <button className="back" onClick={() => nav("/apply")}><I.ArrowLeft /></button>
        <span className="sub">Selecciona tus bancos</span>
      </div>

      <div className="pad" style={{ flex: 1 }}>
        <h2 className="hero sm">¿En qué bancos tienes cuentas?</h2>
        <p className="lead">Conecta los bancos cuya información quieres usar para tu evaluación de crédito.</p>

        <div className="search">
          <I.Search size={18} />
          <input placeholder="Buscar banco..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="tiny" style={{ marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>
          Directorio SFC — {count} entidades
        </div>

        <div className="stack">
          {filtered.map((b) => (
            <button key={b.id} className={`row ${sel.includes(b.id) ? "selected" : ""}`} onClick={() => toggle(b.id)}>
              <span className="chk" style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: b.color, color: b.brand === "bancolombia" ? "#000" : "#fff" }}>
                {b.type === "wallet" ? <I.Wallet size={18} /> : <I.Building size={18} />}
              </span>
              <span className="meta">
                <span className="title">{b.name}</span><br />
                <span className="desc">{b.type === "wallet" ? "Billetera digital" : "Banco"}</span>
              </span>
              <span className="dot" style={{ border: sel.includes(b.id) ? "none" : "2px solid var(--border)", background: sel.includes(b.id) ? "#fff" : "none", color: "#000" }}>
                {sel.includes(b.id) && <I.Check size={12} />}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="footer">
        {err && <div className="err">{err}</div>}
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
          {sel.length} {sel.length === 1 ? "banco seleccionado" : "bancos seleccionados"}
        </div>
        <button className="btn btn-white" disabled={sel.length === 0 || loading} onClick={next}>
          {loading ? "Conectando…" : "Continuar"}
        </button>
      </div>
    </Phone>
  );
}
