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

    const filteredRes = data
      .replaceAll("[32m", "")
      .replaceAll("[33m", "")
      .replaceAll("[35m", "")
      .replaceAll("[37m", "")
      .replaceAll("[39m", "")
      .replaceAll("[90m", "")
      .split("\n");

    if (filteredRes.length >= 3) {
      const upTime = filteredRes
        .at(2)
        .split(" ")
        .slice(-2, -1)
        .at(0)
        .split(":");

      const timeFrame = {
        day: upTime.at(0),
        hour: upTime.at(1),
        minute: upTime.at(2),
        second: upTime.at(3),
      };

      const revisedResponse =
        filteredRes.at(0) +
        ` - UpTime: ${timeFrame.day === "0" ? "" : timeFrame.day}${
          timeFrame.day === "0" ? "" : " days "
        }${timeFrame.hour === "0" ? "" : timeFrame.hour}${
          timeFrame.hour === "0" ? "" : " hours "
        }${timeFrame.minute === "0" ? "" : timeFrame.minute}${
          timeFrame.minute === "0" ? "" : " minutes "
        }${timeFrame.second === "0" ? "" : (+timeFrame.second).toFixed(0)}${
          timeFrame.second === "0" ? "" : " seconds "
        }`;

      setProcess(revisedResponse);
    } else {
      setProcess(filteredRes.at(0));
    }
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
