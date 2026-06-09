import { useNavigate } from "react-router-dom";
import { Phone } from "../components/Phone.jsx";
import * as I from "../icons.jsx";

export default function Home() {
  const nav = useNavigate();
  return (
    <Phone>
      <div className="appbar">
        <h1>Openbank</h1>
        <button className="back" style={{ marginLeft: "auto" }}><I.Bell /></button>
        <div className="avatar">JD</div>
      </div>

      <div className="pad">
        <div className="balance-card">
          <div className="lbl">Saldo disponible</div>
          <div className="amt">$3.482.900</div>
          <div className="lbl" style={{ marginTop: 4 }}>Cuenta Openbank *2048</div>
        </div>

        <div className="section-label">Quick actions</div>
        <div className="quick">
          <div className="qbtn"><I.TrendingUp size={20} />Transferir</div>
          <div className="qbtn"><I.CreditCard size={20} />Pagar</div>
          <div className="qbtn"><I.Wallet size={20} />Recargar</div>
          <div className="qbtn"><I.Building size={20} />Más</div>
        </div>
      </div>

      <div className="divider" />

      <div className="pad">
        <div className="section-label" style={{ marginTop: 0 }}>Explore Openbank</div>
        <div className="stack">
          <button className="row selected" onClick={() => nav("/apply")}>
            <span className="chk" style={{ background: "rgba(255,255,255,.08)", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><I.CreditCard size={18} /></span>
            <span className="meta">
              <span className="title">Solicitar crédito</span><br />
              <span className="desc">Evaluación instantánea con Open Finance</span>
            </span>
          </button>
          <div className="row">
            <span className="meta"><span className="title">Tarjetas</span><br /><span className="desc">Gestiona tus tarjetas</span></span>
          </div>
          <div className="row">
            <span className="meta"><span className="title">Inversiones</span><br /><span className="desc">Haz crecer tu dinero</span></span>
          </div>
        </div>
      </div>

      <div className="tabbar">
        <button className="tab active"><I.Home size={20} />Home</button>
        <button className="tab"><I.CreditCard size={20} />Cards</button>
        <button className="tab"><I.TrendingUp size={20} />Wealth</button>
        <button className="tab"><I.Settings size={20} />More</button>
      </div>
    </Phone>
  );
}
