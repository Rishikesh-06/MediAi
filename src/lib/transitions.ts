import { Variants } from "framer-motion";

// Main page transition - fade + slide up with blur
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.99,
    filter: 'blur(4px)'
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 1.01,
    filter: 'blur(2px)',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1]
    }
  }
};

// Slide from right (forward navigation)
export const slideVariants: Variants = {
  initial: {
    opacity: 0,
    x: 40,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1]
    }
  }
};

// Fade only (minimal, for modals)
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.25 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

// Scale in (for modals and cards)
export const scaleVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.92 
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.15 }
  }
};

// Bottom sheet (mobile modals)
export const bottomSheetVariants: Variants = {
  initial: { 
    y: '100%',
    opacity: 0.8
  },
  animate: { 
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 35
    }
  },
  exit: { 
    y: '100%',
    opacity: 0.8,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1]
    }
  }
};

// Stagger children container
export const containerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
};

// Individual stagger items
export const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// Pop in animation (for checkmarks, badges)
export const popVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25
    }
  }
};

// Directional slide (for wizard steps)
export const getStepVariants = (direction: 'forward' | 'back'): Variants => ({
  initial: { 
    opacity: 0, 
    x: direction === 'forward' ? 40 : -40
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.28,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: { 
    opacity: 0,
    x: direction === 'forward' ? -20 : 20,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1]
    }
  }
});

// Button hover/tap animations
export const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.15 }
};

export const buttonTap = {
  scale: 0.96,
  transition: { duration: 0.1 }
};

// Icon button animations
export const iconButtonHover = { scale: 1.1 };
export const iconButtonTap = { scale: 0.9 };

// Destructive button animations
export const destructiveHover = {
  scale: 1.05,
  backgroundColor: '#ff2d3d'
};
export const destructiveTap = { scale: 0.92 };

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get reduced motion safe variants
export const getMotionProps = (variants: Variants) => {
  if (prefersReducedMotion()) {
    return {
      initial: false,
      animate: "animate",
      exit: false
    };
  }
  return {
    variants,
    initial: "initial",
    animate: "animate",
    exit: "exit"
  };
};
