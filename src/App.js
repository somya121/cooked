 import './App.css';
 import { useState,useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route,Navigate,useNavigate } from 'react-router-dom';
import Home from './components/Home/Home';
import UserSignup from './components/UserSignup/UserSignup';
import DetailsPage from './components/DetailsPage/DetailsPage';
import CookProfile from './components/CookProfile/CookProfile';
import CookDashboard from './components/CookDashboard/CookDashboard';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken,setAuthToken] = useState(null);
  const [userInfo,setUserInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() =>{
    const storedToken = localStorage.getItem('authToken');
    const storedUsername = localStorage.getItem('username');
    if(storedToken ){
      setAuthToken(storedToken); 
      const storedRoles = JSON.parse(localStorage.getItem('userRoles') || '["ROLE_USER"]');
      setUserInfo({username: storedUsername || 'User', roles: storedRoles});
      setIsAuthenticated(true);
    } 
  }, []);



  const handleLoginSuccess = (authData) =>{
    console.log("Login successful in App:", authData);
    if (!authData || !authData.token) {
      console.error("Auth data or token missing in handleLoginSuccess");
      return;
  }
    localStorage.setItem('authToken', authData.token); // Store token
    localStorage.setItem('username', authData.username || ''); // Store username
    localStorage.setItem('userRoles', JSON.stringify(authData.roles || []));
    const roles = authData.roles || []; // Get roles from response
    const userDetails = { username: authData.username, email: authData.email, roles: authData.roles || [] }; // Store roles

    setAuthToken(authData.token);
    setUserInfo(userDetails);
    setIsAuthenticated(true);

    const isCook = roles.includes("ROLE_COOK");
    const justInitiatedCookReg = authData.message?.toLowerCase().includes("initiated cook registration") || authData.status === "PENDING_COOK_PROFILE";

        if (justInitiatedCookReg && !isCook) {
            navigate('/cook-profile-setup');
        } else if(isCook) {
            navigate('/cook-dashboard');
        }
        else{
          navigate('/details');
        }
  };
return(
<div className='App'>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={ !isAuthenticated ? <UserSignup flowType="user" onLoginSuccess={handleLoginSuccess} /> : <Navigate to={userInfo?.roles?.includes("ROLE_COOK") ? "/cook-dashboard" : "/details"} replace />}/>
                 <Route path="/signup-cook" element={ !isAuthenticated ? <UserSignup flowType="cook" onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/details" replace /> }/>
                 {/* <Route path="/cook-profile-setup/:setupToken" element={<CookProfile onLoginSuccess={handleLoginSuccess} />} />        */}
                 <Route path="/cook-profile-setup" element={ isAuthenticated ? <CookProfile /> : <Navigate to="/signin" replace /> } />
                  <Route
                    path="/details"
                    element={
                        isAuthenticated ? (
                            <DetailsPage/>
                        ) : (
                            <Navigate to="/signin" replace />
                        )
                    }
                />
                <Route
                    path="/cook-profile-setup/:setupToken" // Expects token in URL
                    element={<CookProfile onLoginSuccess={handleLoginSuccess} />}
                 />
      </Routes>
      </div>
)
}
  function App() {
  return (
<Router>
<AppContent />
    </Router>

  );
}

export default App;
