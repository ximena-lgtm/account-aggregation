import { createContext, useContext, useState } from "react";

const FlowContext = createContext(null);
export const useFlow = () => useContext(FlowContext);

export function FlowProvider({ children }) {
  const [state, setState] = useState({
    applicationId: null,
    selectedBanks: [],   // [{id,name,...}]
    consents: [],        // [{id, bank_id, status}]
    queue: [],           // consent ids pendientes de autorizar
    decision: null
  });
  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  return <FlowContext.Provider value={{ ...state, update }}>{children}</FlowContext.Provider>;
}
