import HeaderNav from "@/components/homepage/header-nav";
import FooterSection from "@/components/homepage/footer";
import HeroSection from "@/components/homepage/hero-section";
import FeaturesSection from "@/components/homepage/features-section";
import BenefitsSection from "@/components/homepage/benefits-section";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Magellan CRBI - Streamline Your Citizenship & Residency Advisory Practice",
  description: "The complete platform for managing Citizenship & Residency by Investment applications. Reduce administrative overhead by 30% while delivering exceptional client experiences.",
  keywords: ["CRBI", "citizenship by investment", "residency by investment", "St. Kitts", "Antigua", "Dominica", "Grenada", "advisory platform"],
  openGraph: {
    title: "Magellan CRBI - CRBI Advisory Platform",
    description: "Streamline your Citizenship & Residency by Investment practice with our comprehensive management platform.",
    type: "website",
    siteName: "Magellan CRBI"
  }
};

export default async function Home() {
  return (
    <>
      <HeaderNav />
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <FooterSection />
    </>
  );
}
