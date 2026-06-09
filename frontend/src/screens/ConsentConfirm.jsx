import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Phone } from "../components/Phone.jsx";
import { useFlow } from "../flow.jsx";
import { api } from "../api.js";
import * as I from "../icons.jsx";

export default function ConsentConfirm() {
  const { consentId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const flow = useFlow();
  const [consent, setConsent] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const otp = loc.state?.otp || "123456";

  useEffect(() => {
    api.getConsent(consentId).then(setConsent).catch((e) => setErr(e.message));
  }, [consentId]);

  function advance() {
    const queue = flow.queue.filter((id) => id !== consentId);
    flow.update({ queue });
    if (queue.length > 0) nav(`/consent/${queue[0]}/sca`);
    else nav("/analyzing");
  }

  async function authorize() {
    setBusy(true); setErr(null);
    try { await api.authorizeConsent(consentId, otp); advance(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  async function deny() {
    setBusy(true); setErr(null);
    try { await api.denyConsent(consentId); advance(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  const brand = consent?.bank?.brand || "generic";
  const isDavi = brand === "daviplata";
  const isNu = brand === "nu";
  const cls = isNu ? "nu" : (isDavi ? "daviplata" : "bancolombia");
  const btn = isNu ? "btn-purple" : (isDavi ? "btn-red" : "btn-yellow");
  const storeName = consent?.bank?.name || "El banco";

  return (
    <Phone>
      {consent && (
        <div className={`brandbar ${cls}`}>
          <div className="bname">{consent.bank.name}</div>
          <div className="bsub">Autorización de acceso</div>
        </div>
      )}

      <div className="pad" style={{ flex: 1, paddingTop: 18 }}>
        <h2 className="hero sm">¿Autorizar el siguiente acceso a tus datos?</h2>

        <div className="stack" style={{ marginTop: 14 }}>
          {consent?.scopes.map((s, i) => (
            <div className="scope" key={i}>
              <span className="chk"><I.Check size={14} /></span>{s}
            </div>
          ))}
        </div>

        <div className="purpose">
          <I.Lock size={16} /> Propósito: {consent?.purpose}
        </div>

        <p className="note" style={{ marginTop: 16 }}>
          Decreto 368/2026 · Art. 2.35.8.3.3 · {storeName} almacena el consentimiento.
        </p>
      </div>

      <div className="footer">
        {err && <div className="err">{err}</div>}
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={deny} disabled={busy}>Negar</button>
          <button className={`btn ${btn}`} onClick={authorize} disabled={busy}>
            {busy ? "…" : "Autorizar"}
          </button>
        </div>
      </div>
    </Phone>
  );
}
