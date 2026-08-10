import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import { RealtimeProvider } from "./RealtimeContext.jsx";
import { ToastProvider } from "./ToastContext.jsx";
import { SearchProvider } from "./SearchContext.jsx";
import "./styles/global.css";
import "leaflet/dist/leaflet.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <ToastProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </ToastProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
