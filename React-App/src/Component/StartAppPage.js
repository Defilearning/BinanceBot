import { useRef, useState } from "react";

const StartAppPage = () => {
  const [process, setProcess] = useState(null);
  const [startBot, setStartBot] = useState(null);
  const [position, setPosition] = useState(null);
  const [checkboxState, setCheckboxState] = useState(false);
  const [startDelay, setStartDelay] = useState(null);
  const [type, setType] = useState(null);

  const checkbox = useRef();
  const longOnly = useRef();
  const shortOnly = useRef();
  const hourInput = useRef();
  const minInput = useRef();
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

  const startProcess = async () => {
    const response = await fetch("/bot/start", {
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
        hour: `${hourInput.current?.value ? hourInput.current.value : 0}`,
        minute: `${minInput.current?.value ? minInput.current.value : 0}`,
        type,
      }),
    });

    const { data } = await response.json();

    setStartBot(data);
  };

  const clearStartDelay = async () => {
    const response = await fetch("/bot/clearStartTime", {
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

    setStartDelay(data);
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

  const onDelay = () => {
    if (checkbox.current.checked === true) {
      setCheckboxState(true);
    } else {
      setCheckboxState(false);
    }
  };

  const onLong = () => {
    if (longOnly.current.checked === true) {
      setType("long");
    } else {
      setType(null);
    }
  };

  const onShort = () => {
    if (shortOnly.current.checked === true) {
      setType("short");
    } else {
      setType(null);
    }
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
        <div className="mt-3">
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
      </div>
      <div>
        <div className="flex justify-between">
          <div className="flex gap-2">
            <input type="checkbox" ref={checkbox} onChange={onDelay} />
            <label className="font-semibold">Delay?</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" ref={longOnly} onChange={onLong} />
            <label className="font-semibold">Long only?</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" ref={shortOnly} onChange={onShort} />
            <label className="font-semibold">Short only?</label>
          </div>
        </div>
        {checkboxState && (
          <div className="flex justify-around">
            <div className="flex flex-col w-5/12">
              <label>Hours</label>
              <input ref={hourInput} className="border" />
            </div>
            <div className="flex flex-col w-5/12">
              <label>Minutes</label>
              <input ref={minInput} className="border" />
            </div>
          </div>
        )}
        <div className="flex flex-col">
          <label>2FA code*</label>
          <input ref={authenticationCode} className="border" />
        </div>
      </div>
      <div>
        <button
          className="py-2 px-5 border bg-slate-100 w-full font-semibold"
          onClick={startProcess}
        >
          Start Process
        </button>
        <div className="bg-slate-300 h-20 border text-sm">
          {startBot && <p>{startBot}</p>}
        </div>
      </div>
      <div>
        <button
          className="py-2 px-5 border bg-slate-100 w-full font-semibold"
          onClick={clearStartDelay}
        >
          Clear start delay
        </button>
        <div className="bg-slate-300 h-20 border text-sm">
          {startDelay && <p>{startDelay}</p>}
        </div>
      </div>
    </div>
  );
};

export default StartAppPage;
