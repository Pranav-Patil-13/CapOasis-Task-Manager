import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './NavBar';
import AboutUs from './AboutUs';
import Employees from './Employees';
import Login from './Login';
import './Home.css';

export default function Home({ user, onAuth }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/employee');
    }
  }, [user, navigate]);

  return (
    <div className="home-root">
      <NavBar />
      <div className="public-container">
        {/* BANNER AND LOGIN SECTION */}
        <section id="hero" className="section-block hero-section">
          <div className="hero-content">
            {/* WEBSITE BANNER - LEFT SIDE */}
            <div className="banner-container">
              <div className="banner-placeholder">
                <h1>Task Manager</h1>
                <p>Efficient task management for teams</p>
              </div>
            </div>
            {/* LOGIN SECTION - RIGHT SIDE */}
            <div className="login-container">
              {!user && <Login onAuth={onAuth} />}
            </div>
          </div>
        </section>
        <section id="about" className="section-block">
          <AboutUs />
        </section>
        <section id="employees" className="section-block">
          <Employees />
        </section>
      </div>
    </div>
  );
}
