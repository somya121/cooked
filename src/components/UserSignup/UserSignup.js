import React    from "react";
import Header from "../Header/Header.js";
import LoginCard from "../LoginCard/LoginCard.js";
import "./UserSignup.css";

function UserSignup({ flowType, onLoginSuccess }) {
  return(
    <div >
    <Header />
    <main className="signup-content-container"> 
      <LoginCard flowType={flowType} onLoginSuccess={onLoginSuccess} />
    </main>
    </div>
  );
}
export default UserSignup;