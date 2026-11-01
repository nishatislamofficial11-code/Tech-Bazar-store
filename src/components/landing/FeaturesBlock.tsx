import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FeatureItem {
  title: string;
  description: string;
}

interface FeaturesData {
  title: string;
  items: FeatureItem[];
}

export default function FeaturesBlock({ data }: { data: FeaturesData }) {
  if (!data.items?.length) return null;

  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">{data.title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.items.map((item, index) => (
            <div key={index} className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary/30 transition-colors group text-center">
              <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
