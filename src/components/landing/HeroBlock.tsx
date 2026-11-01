import React from 'react';

interface HeroData {
  headline: string;
  subheadline: string;
  buttonText: string;
  buttonLink: string;
  imageUrl?: string;
  alignment: string;
}

export default function HeroBlock({ data }: { data: HeroData }) {
  return (
    <div className="relative overflow-hidden bg-primary/5 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col lg:flex-row items-center gap-12 ${data.alignment === 'center' ? 'text-center' : 'text-left'}`}>
          <div className="flex-1 space-y-8">
            <h1 className="text-4xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {data.headline}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
              {data.subheadline}
            </p>
            <div>
              <a
                href={data.buttonLink}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-primary hover:bg-primary-hover rounded-full transition-all hover:scale-105 shadow-xl shadow-primary/25"
              >
                {data.buttonText}
              </a>
            </div>
          </div>
          {data.imageUrl && (
            <div className="flex-1 w-full max-w-lg lg:max-w-none">
              <img src={data.imageUrl} alt="Hero" className="w-full rounded-2xl shadow-2xl object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
