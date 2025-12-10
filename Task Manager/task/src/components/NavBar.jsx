import React, { useState } from "react";
import "./Navbar.css";

export default function NavBar({ onLogout, user }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <h2 className="logo">CapOasis</h2>

      {/* HAMBURGER BUTTON */}
      <button
        className={`hamburger ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* NAVIGATION LINKS */}
      <ul className={`nav-links ${menuOpen ? "active" : ""}`}>
        <li>
          <a href="#about" onClick={closeMenu}>About Us</a>
        </li>
        <li>
          <a href="#employees" onClick={closeMenu}>Employees</a>
        </li>

        
      </ul>
    </nav>
  );
}
