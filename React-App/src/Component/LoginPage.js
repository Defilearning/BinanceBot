import { useRef } from "react";

const LoginPage = ({ loginStatus }) => {
  const usernameInput = useRef(null);
  const passwordInput = useRef(null);

  const login = async () => {
    const input = {
      username: usernameInput.current.value,
      password: passwordInput.current.value,
    };

    const fetchData = await fetch("/bot/login", {
      method: "POST",
      mode: "same-origin",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data = await fetchData.json();

    if (data.status === "success") {
      loginStatus(true);
    } else {
      loginStatus(false);
    }
  };
  return (
    <div className="p-5 border rounded-xl w-72">
      <form className="flex flex-col">
        <label>Username: </label>
        <input ref={usernameInput} className="bg-slate-100"></input>
        <label>Password: </label>
        <input
          ref={passwordInput}
          type="password"
          className="bg-slate-100"
        ></input>
      </form>
      <button
        onClick={login}
        className="mt-4 border p-3 py-1 rounded-md bg-slate-100 font-semibold"
      >
        Login
      </button>
    </div>
  );
};

export default LoginPage;
