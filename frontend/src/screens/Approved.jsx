import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "../components/Phone.jsx";
import { useFlow } from "../flow.jsx";
import * as I from "../icons.jsx";

const fmt = (n) => "$" + (n || 0).toLocaleString("es-CO");

export default function Approved() {
  const nav = useNavigate();
  const flow = useFlow();
  const d = flow.decision;

  useEffect(() => { if (!d) nav("/"); }, []);
  if (!d) return null;

  const conds = [
    ["Tasa de interés", `${d.rate}% E.M.`],
    ["Plazo", `${d.term_months} meses`],
    ["Cuota mensual", fmt(d.monthly_payment)],
    ["Primer pago", d.first_payment]
  ];

  return (
    <Phone>
      <div className="success-hero">
        <div className="success-circle"><I.Check size={48} /></div>
        <h2 className="hero" style={{ textAlign: "center" }}>{d.approved ? "¡Cupo aprobado!" : "Solicitud no aprobada"}</h2>
        <p className="lead" style={{ textAlign: "center" }}>
          {d.approved ? "Tu solicitud fue evaluada y aprobada." : "No fue posible aprobar tu solicitud en este momento."}
        </p>
      </div>

      {d.approved && (
        <>
          <div className="divider" />
          <div className="amount-block">
            <div className="lbl" style={{ color: "var(--text-2)", fontSize: 13 }}>Cupo disponible</div>
            <div className="big">{fmt(d.amount)} <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 400 }}>{d.currency}</span></div>
          </div>

          <div className="divider" />
          <div className="pad">
            <div className="section-label" style={{ color: "var(--text-2)", fontSize: 15, marginTop: 0 }}>Condiciones del crédito</div>
            <div className="stack">
              {conds.map(([k, v]) => (
                <div className="cond" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
            </div>

            <div className="card-2" style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "var(--text-3)" }}>
              <I.TrendingUp size={16} /> <span>{d.rationale}</span>
            </div>
            <div className="purpose" style={{ marginTop: 10 }}>
              <I.Lock size={16} /> El acceso a tus datos vence en {d.expires_in_days} días. Puedes revocar en cualquier momento.
            </div>
          </div>
        </>
      )}

      <div className="footer">
        <button className="btn btn-white" onClick={() => nav("/")}>{d.approved ? "Aceptar cupo" : "Volver al inicio"}</button>
        {d.approved && <button className="linkbtn" onClick={() => nav("/")}>Ver detalles completos</button>}
      </div>
    </Phone>
  );
}
