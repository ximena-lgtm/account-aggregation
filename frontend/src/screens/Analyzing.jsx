import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "../components/Phone.jsx";
import { useFlow } from "../flow.jsx";
import { api } from "../api.js";
import * as I from "../icons.jsx";

const STEPS = [
  "Conectando con bancos autorizados",
  "Leyendo movimientos · últimos 90 días",
  "El Hub normaliza tus datos",
  "Calculando capacidad de pago",
  "Generando decisión"
];

export default function Analyzing() {
  const nav = useNavigate();
  const flow = useFlow();
  const [active, setActive] = useState(0);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!flow.applicationId) { nav("/"); return; }
    const t = setInterval(() => setActive((a) => Math.min(a + 1, STEPS.length - 1)), 700);
    const run = setTimeout(async () => {
      try {
        const decision = await api.evaluate(flow.applicationId);
        flow.update({ decision });
        nav("/approved");
      } catch (e) { setErr(e.message); }
    }, 3800);
    return () => { clearInterval(t); clearTimeout(run); };
  }, []);

  return (
    <Phone>
      <div className="appbar">
        <span className="sub">Evaluación de crédito</span>
      </div>
      <div className="divider" />

      <div className="spinner-wrap">
        <div className="spinner"><div className="inner"><I.TrendingUp size={28} /></div></div>
      </div>
      <div className="center-text">
        <h2 className="hero sm">Analizando tu perfil financiero</h2>
        <p className="lead">Estamos procesando los datos de tus cuentas para evaluar tu solicitud.</p>
      </div>

      <div className="pad" style={{ marginTop: 22 }}>
        <div className="stack">
          {STEPS.map((s, i) => {
            const st = i < active ? "done" : i === active ? "active" : "pending";
            return (
              <div className={`prog-row ${st}`} key={i}>
                <span className={`dot ${st}`}>{st === "done" && <I.Check size={11} />}</span>
                {s}
              </div>
            );
          })}
        </div>
      </div>

      <div className="footer">
        {err && <div className="err">{err}</div>}
        <div className="purpose"><I.Lock size={16} /> Datos usados solo para esta evaluación · Revocable en cualquier momento</div>
        <div className="card-2" style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "var(--text-2)" }}>
          <I.Clock size={16} /> Tiempo estimado: menos de 30 segundos
        </div>
      </div>
    </Phone>
  );
}
