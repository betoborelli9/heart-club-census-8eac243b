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
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <video
              autoPlay
              muted
              playsInline
              src={splashVideo}
              // "object-contain" garante que o logo NUNCA seja cortado, não importa a tela
              className="w-full h-full object-contain max-w-[100vw] max-h-[100vh] sm:max-w-[450px] sm:max-h-[800px]"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;