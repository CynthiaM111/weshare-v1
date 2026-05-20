import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import Affordability from "@/components/sections/Affordability";
import HowItWorks from "@/components/sections/HowItWorks";
import WhyWeShare from "@/components/sections/WhyWeShare";
import OurStory from "@/components/sections/OurStory";
import Download from "@/components/sections/Download";
import Team from "@/components/sections/Team";
import SiteFooter from "@/components/sections/Footer";
import WaveDivider from "@/components/WaveDivider";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WaveDivider />
        <Affordability />
        <HowItWorks />
        <WhyWeShare />
        <OurStory />
        <WaveDivider flip />
        <Download />
        <Team />
      </main>
      <SiteFooter />
    </>
  );
}
