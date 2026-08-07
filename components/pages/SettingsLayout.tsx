'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { motion } from 'framer-motion';
import { useLanguage } from "@/context/LanguageContext";

interface SettingSection {
  title: string;
  description: string;
  fields: {
    label: string;
    type: 'text' | 'email' | 'password' | 'toggle' | 'select';
    placeholder?: string;
    value?: any;
    options?: string[];
  }[];
}

interface SettingsLayoutProps {
  title: string;
  description: string;
  sections: SettingSection[];
}

export function SettingsLayout({ title, description, sections }: SettingsLayoutProps) {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-1 tracking-tight">{title}</h1>
              <p className="text-gray-400">{description}</p>
            </div>

            <div className="space-y-8">
              {sections.map((section, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                >
                  <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10">
                    <div className="mb-6 border-b border-white/10 pb-4">
                      <h3 className="text-xl font-bold text-white mb-1">{section.title}</h3>
                      <p className="text-sm text-gray-400">{section.description}</p>
                    </div>

                    <div className="space-y-6">
                      {section.fields.map((field, j) => (
                        <div key={j} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="sm:w-1/3">
                            <label className="text-sm font-semibold text-gray-300">{field.label}</label>
                          </div>
                          <div className="sm:w-2/3">
                            {field.type === 'toggle' ? (
                              <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${field.value ? 'bg-blue-600' : 'bg-white/10'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-0'}`} />
                              </div>
                            ) : field.type === 'select' ? (
                              <select className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
                                {field.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <Input 
                                type={field.type} 
                                placeholder={field.placeholder} 
                                defaultValue={field.value}
                                className="w-full bg-black/50 border-white/10" 
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              ))}

              <div className="flex justify-end pt-4">
                <Button className="bg-blue-600 hover:bg-blue-500 font-bold px-8">{'Save changes'}</Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
