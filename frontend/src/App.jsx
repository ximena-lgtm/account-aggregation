import { Routes, Route } from "react-router-dom";
import { FlowProvider } from "./flow.jsx";
import Home from "./screens/Home.jsx";
import Apply from "./screens/Apply.jsx";
import BankSelector from "./screens/BankSelector.jsx";
import SCA from "./screens/SCA.jsx";
import ConsentConfirm from "./screens/ConsentConfirm.jsx";
import Analyzing from "./screens/Analyzing.jsx";
import Approved from "./screens/Approved.jsx";

export default function App() {
  return (
    <FlowProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/banks" element={<BankSelector />} />
        <Route path="/consent/:consentId/sca" element={<SCA />} />
        <Route path="/consent/:consentId" element={<ConsentConfirm />} />
        <Route path="/analyzing" element={<Analyzing />} />
        <Route path="/approved" element={<Approved />} />
      </Routes>
    </FlowProvider>
  );
}
