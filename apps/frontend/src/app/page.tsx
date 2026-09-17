import { Nav } from "@/components/marketing/Nav";
import { Hero } from "@/components/marketing/Hero";
import { OwnerCta } from "@/components/marketing/OwnerCta";
import { ProblemSolution } from "@/components/marketing/ProblemSolution";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Features } from "@/components/marketing/Features";
import { RegisteredPlaces } from "@/components/marketing/RegisteredPlaces";
import { Faq } from "@/components/marketing/Faq";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Footer } from "@/components/marketing/Footer";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getCities(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/public/marketplace/cities`, {
      next: { revalidate: 300 },
    });
    return res.ok ? ((await res.json()) as string[]) : [];
  } catch {
    return [];
  }
}

// Home agora serve dois públicos, na mesma ordem que o Trinks usa: primeiro quem está
// procurando um salão (Hero com busca), depois quem tem um salão e quer aparecer nessa
// busca (OwnerCta) — só então o discurso de produto pro dono (ProblemSolution em diante).
export default async function Home() {
  const cities = await getCities();

  return (
    <>
      <Nav />
      <main>
        <Hero cities={cities} />
        <OwnerCta />
        <RegisteredPlaces />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <Faq />
        <FinalCta />
      </main>
      <Footer isHome />
    </>
  );
}
