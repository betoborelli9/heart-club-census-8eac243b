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
    }, 4500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] bg-black overflow-hidden"
        >
          <video
            autoPlay
            muted
            playsInline
            src={splashVideo}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;