import React    from "react";
import {Link} from 'react-router-dom';
import './Home.css';
import logo from '../../shared/logo.png';
function Home() {
  return (
    <div className="home-container">
      <div className="content-wrapper">
        <div className="card">
        <img src={logo} alt="Cooked" className="home-logo" />
        </div>
        <div className="auth-actions">
          <Link to="/signin" className="auth-button signin-button">
            Find Cooks Near You
          </Link>
          <Link to="/signup-cook" className="auth-button signup-button">
            Join As A Cook
          </Link>
        </div>
      </div>
    </div>
  );
}
export default Home;