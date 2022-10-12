import { useEffect, useState } from "react";
import "./App.css";
import Application from "./Component/ApplicationPage";
import LoginPage from "./Component/LoginPage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [triedLogIn, setTriedLogIn] = useState(false);

  useEffect(() => {
    const fetchLogInStatus = async () => {
      const fetchData = await fetch("/isLoggedIn", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          mode: "same-origin",
          // authorization: `Bearer ${token}`,
        },
      });
      const { status } = await fetchData.json();

      if (status === "success") {
        setIsLoggedIn(true);
      }
    };

    fetchLogInStatus();
  }, []);

  const loginStatus = (status) => {
    if (status) {
      setIsLoggedIn(true);
      setTriedLogIn(true);
    } else {
      setIsLoggedIn(false);
      setTriedLogIn(true);
    }
  };

  const logout = async () => {
    await fetch("/bot/logout", {
      method: "GET",
      mode: "same-origin",
      // mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // localStorage.removeItem("EBJWT");
    setIsLoggedIn(false);
    setTriedLogIn(false);
  };

  return (
    <div className="h-screen w-screen overflow-hiddenr flex flex-col text-sm md:text-base">
      {isLoggedIn && (
        <button className="bg-yellow-500 w-full h-7" onClick={logout}>
          Logout
        </button>
      )}
      <div className="h-full overflow-hidden bg-slate-700 relative flex justify-center items-center">
        <div className="p-4 bg-slate-400 border rounded-xl w-5/6 h-5/6 max-w-3xl max-h-screen flex justify-center items-center flex-col">
          {isLoggedIn && <Application />}
          {!isLoggedIn && <LoginPage loginStatus={loginStatus} />}
          {triedLogIn && !isLoggedIn && (
            <p>Username or password is incorrect! Please try again</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
