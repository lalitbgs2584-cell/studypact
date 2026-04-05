"use client";
import React from 'react';
import { Sidebar } from "@/components/shared/sidebar";
import { motion } from "framer-motion";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-black/95 text-zinc-100 overflow-hidden">
      <Sidebar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-1 overflow-y-auto w-full"
      >
        <div className="mx-auto max-w-6xl p-6 lg:p-10 w-full">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
