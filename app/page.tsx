import Hero from '@/components/landing/Hero';
import WhatYoullMaster from '@/components/landing/WhatYoullMaster';
import YourPath from '@/components/landing/YourPath';
import BuiltByExperts from '@/components/landing/BuiltByExperts';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <WhatYoullMaster />
      <YourPath />
      <BuiltByExperts />
      <FinalCTA />
      <Footer />
    </main>
  );
}
