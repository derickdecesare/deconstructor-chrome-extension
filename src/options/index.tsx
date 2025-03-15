import React from "react";
import { createRoot } from "react-dom/client";
import OptionsApp from "./OptionsApp";
import "../assets/css/tailwind.css";

const root = createRoot(document.getElementById("options-root")!);
root.render(<OptionsApp />);
