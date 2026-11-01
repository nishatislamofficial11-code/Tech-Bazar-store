import React from 'react';

interface CTAData {
  headline: string;
  subheadline: string;
  buttonText: string;
  buttonLink: string;
}

export default function CTABlock({ data }: { data: CTAData }) {
  return (
    <div className="py-20 bg-primary relative overflow-hidden text-center">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-black opacity-10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
          {data.headline}
        </h2>
        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          {data.subheadline}
        </p>
        <a
          href={data.buttonLink}
          className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-primary bg-white hover:bg-gray-50 rounded-full transition-transform hover:scale-105 shadow-xl"
        >
          {data.buttonText}
        </a>
      </div>
    </div>
  );
}
