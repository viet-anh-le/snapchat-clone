import "./App.css";
import { useEffect } from "react";
import AllRoutes from "./routes/AllRoutes";
import { websocketService } from "./lib/websocket";
import { useAuth } from "./context/AuthContext";

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user?.uid) {
      if (!websocketService.isConnected) {
        websocketService.connect();
      }
    } else {
      if (websocketService.isConnected) {
        websocketService.disconnect();
      }
    }
  }, [user?.uid, loading]);

  if (loading) return <div>Loading...</div>;

  return <AllRoutes />;
}

export default App;
