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
    }, 4500); // 4.5 segundos de exibição
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          // O segredo está aqui: fixed inset-0 e overflow-hidden
          className="fixed inset-0 z-[9999] bg-black overflow-hidden flex items-center justify-center"
          style={{ width: '100vw', height: '100vh' }}
        >
          <video
            autoPlay
            muted
            playsInline
            src={splashVideo}
            // object-cover garante que o vídeo preencha a tela sem distorcer
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover"
            style={{ 
              width: '100vw', 
              height: '100vh',
              pointerEvents: 'none' 
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;