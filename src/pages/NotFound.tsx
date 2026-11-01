import React from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { SEO } from '../components/SEO';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SEO title="Page Not Found" />
      <div className="max-w-2xl w-full text-center space-y-8">
        
        {/* Animated 404 Text */}
        <div className="relative flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-[150px] md:text-[200px] font-black text-gray-100 select-none tracking-tighter"
          >
            404
          </motion.div>
          
          {/* Overlay Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white p-4 rounded-full shadow-lg text-primary"
            >
              <Search className="w-12 h-12 text-primary" />
            </motion.div>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900"
            >
              Page Not Found
            </motion.h1>
          </div>
        </div>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="text-lg text-gray-500 max-w-md mx-auto"
        >
          Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-3 bg-white text-gray-700 font-medium rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-medium rounded-xl shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--color-primary, #0f172a)' }}
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
