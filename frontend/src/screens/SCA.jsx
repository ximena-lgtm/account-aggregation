import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Phone } from "../components/Phone.jsx";
import { api } from "../api.js";
import * as I from "../icons.jsx";

export default function SCA() {
  const { consentId } = useParams();
  const nav = useNavigate();
  const [consent, setConsent] = useState(null);
  const [user] = useState("usuario@gmail.com");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [err, setErr] = useState(null);
  const refs = useRef([]);

  useEffect(() => {
    api.getConsent(consentId).then(setConsent).catch((e) => setErr(e.message));
  }, [consentId]);

  const brand = consent?.bank?.brand || "generic";
  const isDavi = brand === "daviplata";
  const isNu = brand === "nu";
  const code = otp.join("");

  function setDigit(i, v) {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  }

  function submit() {
    if (code.length !== 6) { setErr("Ingresa el código OTP de 6 dígitos"); return; }
    nav(`/consent/${consentId}`, { state: { otp: code } });
  }

  const cls = isNu ? "nu" : (isDavi ? "daviplata" : "bancolombia");
  const btn = isNu ? "btn-purple" : (isDavi ? "btn-red" : "btn-yellow");

  return (
    <Phone>
      {consent && (
        <div className={`brandbar ${cls}`}>
          <div className="bname">{consent.bank.name}</div>
          <div className="bsub">Autenticación segura</div>
        </div>
      )}

      <div className="pad" style={{ flex: 1, paddingTop: 16 }}>
        <div className="pill"><I.Shield size={14} /> Redirigido por Open Finance Hub · Openbank</div>
        <h2 className="hero sm">Verificación de identidad</h2>
        <p className="lead">Confirma que eres tú para autorizar el acceso de solo lectura.</p>

        <div style={{ height: 18 }} />
        <div className="field">
          <div style={{ flex: 1 }}>
            <div className="lbl">Usuario</div>
            <input value={user} readOnly />
          </div>
        </div>
        <div className="field">
          <I.Lock size={18} />
          <div style={{ flex: 1 }}>
            <div className="lbl">Clave</div>
            <input type="password" defaultValue="********" />
          </div>
        </div>

        <div className="section-label" style={{ marginTop: 16 }}>Código OTP</div>
        <div className="tiny">Enviado a tu celular ***45</div>
        <div className="otp">
          {otp.map((d, i) => (
            <input key={i} ref={(el) => (refs.current[i] = el)} value={d} inputMode="numeric"
              maxLength={1} onChange={(e) => setDigit(i, e.target.value)} />
          ))}
        </div>

        <div className="purpose" style={{ marginTop: 12 }}>
          <I.Fingerprint size={16} /> Usar huella digital / Face ID
        </div>

        <p className="note" style={{ marginTop: 14 }}>
          {consent?.bank?.name || "El banco"} nunca te pedirá tu clave completa. Este acceso es de solo lectura.
        </p>
      </div>

      <div className="footer">
        {err && <div className="err">{err}</div>}
        <button className={`btn ${btn}`} onClick={submit}>Continuar</button>
      </div>
    </Phone>
  );
}
