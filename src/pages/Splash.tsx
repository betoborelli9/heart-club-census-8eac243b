import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import splashVideo from "@/assets/splash.mp4";

const Splash = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => navigate("/login", { replace: true }), 600);
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 bg-background overflow-hidden"
          style={{ width: "100vw", height: "100vh" }}
        >
          <video
            autoPlay
            muted
            playsInline
            className="absolute inset-0 object-cover"
            style={{ width: "100vw", height: "100vh", objectFit: "cover" }}
            src={splashVideo}
          />
          <div className="absolute inset-0 bg-background/30" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;
