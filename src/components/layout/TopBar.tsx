import React from 'react';

export const TopBar = () => {
  return (
    <div className="bg-[#f96a1f] text-white text-[10px] sm:text-xs py-1 sm:py-1.5 px-3 sm:px-4 flex justify-between items-center">
      <div className="flex gap-3 sm:gap-4">
        <a href="#" className="hover:underline">Become a Seller</a>
        <a href="#" className="hover:underline">Help</a>
      </div>
    </div>
  );
};

