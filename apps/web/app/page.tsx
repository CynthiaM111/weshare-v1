import Navbar from "@/components/Navbar";
import FuelPriceBanner from "@/components/FuelPriceBanner";
import Hero from "@/components/sections/Hero";
import Affordability from "@/components/sections/Affordability";
import FareCalculator from "@/components/sections/FareCalculator";
import AppShowcase from "@/components/sections/AppShowcase";
import HowItWorks from "@/components/sections/HowItWorks";
import WhyWeShare from "@/components/sections/WhyWeShare";
import OurStory from "@/components/sections/OurStory";
import Download from "@/components/sections/Download";
import Team from "@/components/sections/Team";
import SiteFooter from "@/components/sections/Footer";
import { SectionRule } from "@/components/SectionRule";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <FuelPriceBanner />
      <FareCalculator />
      <main>
        <Hero />
        <SectionRule accent="teal" />
        <Affordability />
        <SectionRule accent="accent" />
        <AppShowcase />
        <SectionRule accent="teal" />
        <HowItWorks />
        <SectionRule accent="gold" />
        <WhyWeShare />
        <SectionRule accent="accent" />
        <OurStory />
        <SectionRule accent="teal" />
        <Download />
        <SectionRule accent="gold" />
        <Team />
      </main>
      <SiteFooter />
    </>
  );
}
