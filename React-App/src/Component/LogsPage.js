import { useState } from "react";

const LogsPage = () => {
  const [logs, setLogs] = useState(null);

  const fetchOutput = async () => {
    const response = await fetch("/bot/logs", {
      method: "GET",
      mode: "same-origin",
      headers: {
        "Content-Type": "application/json",
        // authorization: `Bearer ${jwt}`,
      },
    });

    const data = await response.json();

    const filteredRes = data.data.split("\n").reverse();
    setLogs(filteredRes);
  };

  const fetchError = async () => {
    const response = await fetch("/bot/error", {
      method: "GET",
      mode: "same-origin",
      headers: {
        "Content-Type": "application/json",
        // authorization: `Bearer ${jwt}`,
      },
    });

    const data = await response.json();

    const filteredRes = data.data.split("\n").reverse();
    setLogs(filteredRes);
  };

  return (
    <div>
      <div className="flex">
        <button
          className="py-2 px-5 border bg-slate-100 w-1/2 font-semibold"
          onClick={fetchOutput}
        >
          Output Logs
        </button>
        <button
          className="py-2 px-5 border bg-slate-100 w-1/2 font-semibold"
          onClick={fetchError}
        >
          Error Logs
        </button>
      </div>
      <div className="logs overflow-scroll bg-slate-300 border">
        {logs &&
          logs.map((el, i) => (
            <p key={i} className="text-xs md:text-sm">
              {el}
            </p>
          ))}
      </div>
    </div>
  );
};

export default LogsPage;
