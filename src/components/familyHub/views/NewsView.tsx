'use client'

import { NewsLanding } from '@/components/news/NewsLanding';

export const NewsView = () => (
  <div className="flex h-full flex-col">
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <h2 className="text-lg font-semibold text-gray-900">Family News &amp; Updates</h2>
      <p className="text-sm text-gray-500">Stay informed with local, school, and family announcements.</p>
    </div>
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <NewsLanding />
    </div>
  </div>
);
