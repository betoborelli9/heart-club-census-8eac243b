import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to splash on first visit
    navigate("/splash", { replace: true });
  }, [navigate]);

  return null;
};

export default Landing;
