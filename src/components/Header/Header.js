import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import logo from '../../shared/logo.png';

function Header() {
  return (
    <header className="app-header">
      <div className="header-logo-container">
        <Link to="/">
          <img src={logo} alt="Your Company Logo" className="header-logo" />
        </Link>
      </div>
    </header>
  );
}

export default Header;