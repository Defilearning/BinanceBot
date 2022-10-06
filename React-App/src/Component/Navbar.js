const Navbar = ({ setCurrentState, currentState }) => {
  const startState = () =>
    setCurrentState({
      start: true,
      stop: false,
      logs: false,
    });

  const stopState = () =>
    setCurrentState({
      start: false,
      stop: true,
      logs: false,
    });

  const logsState = () =>
    setCurrentState({
      start: false,
      stop: false,
      logs: true,
    });

  return (
    <div className="flex justify-between mb-4 font-semibold">
      <button
        className={`border w-1/3 rounded-tl-md ${
          currentState.start ? "bg-slate-50" : "bg-slate-300"
        }`}
        onClick={startState}
      >
        Start
      </button>
      <button
        className={`border w-1/3 ${
          currentState.stop ? "bg-slate-50" : "bg-slate-300"
        }`}
        onClick={stopState}
      >
        Stop
      </button>
      <button
        className={`border w-1/3 rounded-tr-md ${
          currentState.logs ? "bg-slate-50" : "bg-slate-300"
        }`}
        onClick={logsState}
      >
        Logs
      </button>
    </div>
  );
};

export default Navbar;
