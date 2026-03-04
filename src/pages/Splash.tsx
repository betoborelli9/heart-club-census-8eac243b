import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
// 1. IMPORTANTE: Importar o vídeo da pasta assets
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
          className="fixed inset-0 z-[9999] bg-black overflow-hidden pointer-events-none"
          style={{ width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0 }}
        >
          <video
            autoPlay
            muted
            playsInline
            // 2. ALTERAÇÃO AQUI: Usar a variável do import entre chaves
            src={splashVideo}
            className="w-full h-full object-cover"
            style={{ 
              width: "100vw", 
              height: "100vh", 
              objectFit: "cover",
              display: "block" 
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;