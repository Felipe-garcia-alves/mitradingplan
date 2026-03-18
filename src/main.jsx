import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const style = document.createElement("style");
style.textContent = "* { transition: background-color 0.3s, color 0.2s, border-color 0.2s; }";
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);