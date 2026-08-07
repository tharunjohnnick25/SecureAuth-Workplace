"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, ShieldAlert, CheckCircle, Database, Server, Smartphone, Laptop } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const WorkflowDiagram = () => {
    const { t } = useLanguage();
  return (
    <section className="py-20 bg-[#020617] relative border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            {'Seamless'}<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">{'Access workflow'}</span>
          </h2>
          <p className="text-gray-400 text-lg">
            {'Howour aipowered'}</p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Main workflow container */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative z-10">
            
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex-1 glass-panel p-6 rounded-2xl flex flex-col items-center text-center w-full relative z-10"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 border border-blue-500/30">
                <UserPlus className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('1RequestAccess_493')}</h3>
              <p className="text-sm text-gray-400">{'Employeeinitiat'}</p>
              <div className="flex gap-2 mt-4 text-gray-500">
                 <Smartphone className="w-4 h-4" />
                 <Laptop className="w-4 h-4" />
              </div>
            </motion.div>

            {/* Arrow 1 */}
            <div className="hidden md:block w-12 h-0.5 bg-gradient-to-r from-blue-500/50 to-purple-500/50 relative">
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-500"></div>
            </div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex-1 glass-panel p-6 rounded-2xl flex flex-col items-center text-center border-purple-500/20 w-full relative z-10"
            >
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 border border-purple-500/30 relative">
                <ShieldAlert className="w-8 h-8 text-purple-400 animate-pulse" />
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="absolute -inset-2 border border-dashed border-purple-500/40 rounded-full"></motion.div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('2AIRiskEngine_495')}</h3>
              <p className="text-sm text-gray-400">{'Systemevaluates'}</p>
            </motion.div>

            {/* Arrow 2 */}
            <div className="hidden md:block w-12 h-0.5 bg-gradient-to-r from-purple-500/50 to-green-500/50 relative">
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500"></div>
            </div>

            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex-1 glass-panel p-6 rounded-2xl flex flex-col items-center text-center border-green-500/20 w-full relative z-10"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('3AdminApproval_497')}</h3>
              <p className="text-sm text-gray-400">{'Ifriskishighadm'}</p>
              <div className="flex gap-2 mt-4 text-gray-500">
                 <Database className="w-4 h-4" />
                 <Server className="w-4 h-4" />
              </div>
            </motion.div>
          </div>

          {/* Background connector line for mobile */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/20 via-purple-500/20 to-green-500/20 -translate-x-1/2 md:hidden"></div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowDiagram;
