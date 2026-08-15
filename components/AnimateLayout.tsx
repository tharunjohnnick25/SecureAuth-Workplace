'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(10px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1], // easeOutQuint
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    filter: 'blur(10px)',
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function AnimateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
