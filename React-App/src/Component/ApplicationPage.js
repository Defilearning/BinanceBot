import { useState } from "react";
import LogsPage from "./LogsPage";
import Navbar from "./Navbar";
import StartAppPage from "./StartAppPage";
import StopAppPage from "./StopAppPage";

const Application = () => {
  const [currentState, setCurrentState] = useState({
    start: true,
    stop: false,
    logs: false,
  });

  const changeCurrentState = (newState) => setCurrentState(newState);

  return (
    <div className="h-full w-full">
      <Navbar
        setCurrentState={changeCurrentState}
        currentState={currentState}
      />
      {currentState.start && <StartAppPage />}
      {currentState.stop && <StopAppPage />}
      {currentState.logs && <LogsPage />}
    </div>
  );
};

export default Application;
