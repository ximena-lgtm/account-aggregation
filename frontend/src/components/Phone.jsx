export function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="right">4G &nbsp; 100%</span>
    </div>
  );
}

export function Phone({ children }) {
  return (
    <div className="phone">
      <StatusBar />
      <div className="screen">{children}</div>
    </div>
  );
}
