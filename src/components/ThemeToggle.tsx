import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { useCallback } from 'react';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const handleToggle = useCallback(() => {
    // Create flash overlay for smooth transition
    const flash = document.createElement('div');
    flash.className = 'theme-flash';
    document.body.appendChild(flash);

    requestAnimationFrame(() => {
      flash.classList.add('active');
      setTimeout(() => {
        toggleTheme();
        flash.classList.remove('active');
        setTimeout(() => {
          document.body.removeChild(flash);
        }, 200);
      }, 100);
    });
  }, [toggleTheme]);

  return (
    <motion.button
      onClick={handleToggle}
      className="relative flex items-center cursor-pointer p-0 border-0 outline-none"
      style={{
        width: '52px',
        height: '28px',
        borderRadius: '14px',
        background: isLight ? 'var(--accent-green)' : 'var(--bg-hover)',
        border: `1px solid ${isLight ? 'var(--accent-green)' : 'var(--border-default)'}`,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Track icons */}
      <motion.span 
        className="absolute text-xs"
        style={{ left: '7px' }}
        animate={{ opacity: isLight ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        🌙
      </motion.span>
      <motion.span 
        className="absolute text-xs"
        style={{ right: '7px' }}
        animate={{ opacity: isLight ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        ☀️
      </motion.span>

      {/* Thumb */}
      <motion.div
        className="absolute flex items-center justify-center text-xs"
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
        animate={{
          left: isLight ? '27px' : '3px',
          rotate: isLight ? 360 : 0,
        }}
        transition={{ 
          duration: 0.35, 
          ease: [0.25, 0.46, 0.45, 0.94],
          rotate: { duration: 0.5 }
        }}
      >
        {isLight ? '☀️' : '🌙'}
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;
