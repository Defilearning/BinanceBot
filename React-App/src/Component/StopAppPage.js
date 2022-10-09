import { useRef, useState } from "react";

const StopAppPage = () => {
  const [process, setProcess] = useState(null);
  const [stopBot, setStopBot] = useState(null);
  const [position, setPosition] = useState(null);

  const authenticationCode = useRef();

  const checkProcess = async () => {
    const response = await fetch("/bot/list", {
      method: "GET",
      mode: "same-origin",
      headers: {
        "Content-Type": "application/json",
        // authorization: `Bearer ${jwt}`,
      },
    });

    const { data } = await response.json();
    setProcess(data);
  };

  const stopProcess = async () => {
    const response = await fetch("/bot/stop", {
      method: "POST",
      mode: "same-origin",
      headers: {
        "Content-Type": "application/json",
        // authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        authenticator: `${
          authenticationCode.current?.value
            ? authenticationCode.current?.value
            : ""
        }`,
      }),
    });

    const { data } = await response.json();

    setStopBot(data);
  };

  const checkPosition = async () => {
    const response = await fetch("/bot/checkPosition", {
      method: "GET",
      mode: "same-origin",
      headers: {
        "Content-Type": "application/json",
        // authorization: `Bearer ${jwt}`,
      },
    });

    const { data } = await response.json();

    setPosition(data);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          className="py-2 px-5 border bg-slate-100 w-full font-semibold"
          onClick={checkProcess}
        >
          Check Current Process
        </button>
        <div className="bg-slate-300 h-20 border text-sm">
          {process && <p>{process}</p>}
        </div>
      </div>
      <div>
        <button
          className="py-2 px-5 border bg-slate-100 w-full font-semibold"
          onClick={checkPosition}
        >
          Check Current Position
        </button>
        <div className="bg-slate-300 h-20 border text-sm">
          {position && <p>{position}</p>}
        </div>
      </div>
      <div>
        <div className="flex flex-col">
          <label>2FA code*</label>
          <input ref={authenticationCode} className="border" />
        </div>
      </div>
      <div>
        <button
          className="py-2 px-5 border bg-slate-100 w-full font-semibold"
          onClick={stopProcess}
        >
          Stop Process
        </button>
        <div className="bg-slate-300 h-20 border text-sm">
          {stopBot && <p>{stopBot}</p>}
        </div>
      </div>
    </div>
  );
};

export default StopAppPage;
