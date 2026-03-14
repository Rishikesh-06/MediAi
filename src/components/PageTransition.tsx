import { motion } from "framer-motion";
import { ReactNode } from "react";
import { pageVariants, prefersReducedMotion } from "@/lib/transitions";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      variants={pageVariants}
      initial={reducedMotion ? false : "initial"}
      animate="animate"
      exit={reducedMotion ? undefined : "exit"}
      className={className}
      style={{
        width: '100%',
        height: '100%'
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
