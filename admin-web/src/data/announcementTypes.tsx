export const announcementTypes = [
  {
    type: 'Reroute' as const,
    icon: ({ className }: { className?: string }) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3h5l2 3H3V3zM16 3h5v3h-7l2-3zM3 18l3-3H3v3zM18 18h3v-3h-3l-2 3H3l3-4"/></svg>
    ),
    className: 'bg-amber-100 text-amber-700',
    hint: 'Temporary detours or alternate paths',
  },
  {
    type: 'Road Closure' as const,
    icon: ({ className }: { className?: string }) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="11" width="18" height="2" rx="1"/><line x1="3" y1="7" x2="3" y2="17"/><line x1="21" y1="7" x2="21" y2="17"/><path d="M3 11 L6 7 L9 11"/><path d="M21 11 L18 7 L15 11"/></svg>
    ),
    className: 'bg-red-100 text-red-700',
    hint: 'Impassable roads or sections',
  },
  {
    type: 'Fare Update' as const,
    icon: ({ className }: { className?: string }) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1M9.5 9.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1-5 0zm0 5a2.5 2.5 0 0 0 5 0"/></svg>
    ),
    className: 'bg-green-100 text-green-700',
    hint: 'LTFRB-approved fare changes',
  },
  {
    type: 'Safety Advisory' as const,
    icon: ({ className }: { className?: string }) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    ),
    className: 'bg-blue-100 text-blue-700',
    hint: 'Safety notices or alerts',
  },
  {
    type: 'General Update' as const,
    icon: ({ className }: { className?: string }) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    ),
    className: 'bg-gray-100 text-gray-700',
    hint: 'Miscellaneous updates & notices',
  },
  {
    type: 'Holiday Notice' as const,
    icon: ({ className }: { className?: string }) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
    className: 'bg-purple-100 text-purple-700',
    hint: 'Holiday schedule notices',
  },
] as const;

export type AnnouncementTypeMeta = typeof announcementTypes[number];
