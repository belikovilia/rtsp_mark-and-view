import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ViewerPage from "./ViewerPage";
import MarkupPage from "./MarkupPage";
import "./App.css";

function Menu() {
  const location = useLocation();
  return (
    <nav className="main-menu">
      <Link to="/" className={location.pathname === "/" ? "active" : ""}>Разметка</Link>
      <Link to="/view" className={location.pathname === "/view" ? "active" : ""}>Просмотр</Link>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <Menu />
      <Routes>
        <Route path="/" element={<MarkupPage />} />
        <Route path="/view" element={<ViewerPage />} />
      </Routes>
    </Router>
  );
}
