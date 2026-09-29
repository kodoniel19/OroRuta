import React from 'react';
import { Logo } from '../ui/Logo';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full w-full bg-white">
      <aside className="relative hidden w-[46%] max-w-[640px] overflow-hidden lg:block">
        <img
          src="https://cdn.magicpatterns.com/patterns/generated-images/8791bf98-2ba3-4277-bf1c-3674e99d2600.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/75" aria-hidden />
        <div className="relative flex h-full min-h-screen flex-col justify-between p-10 text-white">
          <Logo tone="light" />
          <div>
            <h2 className="max-w-md text-[28px] font-semibold leading-tight tracking-tight">
              Keep every jeepney route in Cagayan de Oro accurate and up to date.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">
              Manage the routes, terminals, stops and rerouting notices that power the OroRuta commuter app.
            </p>
          </div>
          <p className="text-xs text-white/60">
            © 2026 OroRuta · College of Information Technology, Liceo de Cagayan University
          </p>
        </div>
      </aside>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

