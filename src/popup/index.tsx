import React from "react";
import { createRoot } from "react-dom/client";
import PopupApp from "./PopupApp";
import "../assets/css/tailwind.css";

const root = createRoot(document.getElementById("popup-root")!);
root.render(<PopupApp />);
