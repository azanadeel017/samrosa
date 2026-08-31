import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Roles from "@/components/Roles";
import Closing from "@/components/Closing";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Roles />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
