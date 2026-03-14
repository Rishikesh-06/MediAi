import { motion } from "framer-motion";
import { Construction } from "lucide-react";

const ComingSoon = ({ title }: { title: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center min-h-[60vh] text-center"
  >
    <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
      <Construction className="h-10 w-10 text-muted-foreground" />
    </div>
    <h1 className="font-display text-2xl font-bold text-foreground mb-2">{title}</h1>
    <p className="text-muted-foreground text-sm max-w-md">
      This screen is being built. Check back soon for the full experience.
    </p>
  </motion.div>
);

export default ComingSoon;
