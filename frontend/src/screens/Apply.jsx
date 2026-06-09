import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "../components/Phone.jsx";
import { useFlow } from "../flow.jsx";
import { api } from "../api.js";
import * as I from "../icons.jsx";

const STEPS = [
  "Seleccionas qué bancos conectar",
  "Autorizas cada banco via Open Finance Hub",
  "Evaluamos y te damos una decisión instantánea"
];

export default function Apply() {
  const nav = useNavigate();
  const { update } = useFlow();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function start() {
    setLoading(true); setErr(null);
    try {
      const { id } = await api.createApplication();
      update({ applicationId: id });
      nav("/banks");
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <Phone>
      <div className="appbar">
        <button className="back" onClick={() => nav("/")}><I.ArrowLeft /></button>
        <span className="sub">Apply for Credit</span>
      </div>

      <div className="pad" style={{ flex: 1 }}>
        <h2 className="hero">Para evaluar tu solicitud usaremos tres fuentes de datos.</h2>
        <p className="lead">Una de ellas requiere tu consentimiento.</p>

        <div className="section-label">Qué pasa a continuación</div>
        {STEPS.map((s, i) => (
          <div className="step" key={i}>
            <div className="num">{i + 1}</div>
            <div className="txt">{s}</div>
          </div>
        ))}

        <div className="purpose" style={{ marginTop: 16 }}>
          <I.Lock size={16} />
          <span>Usado solo para esta evaluación. Revocable en cualquier momento.</span>
        </div>
      </div>

      <div className="footer">
        {err && <div className="err">{err}</div>}
        <button className="btn btn-white" onClick={start} disabled={loading}>
          {loading ? "Creando solicitud…" : "Comenzar"}
        </button>
      </div>
    </Phone>
  );
}
