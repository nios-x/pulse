import { PcosIntro } from "@/components/pcos/pcos-intro";

// The welcome lives in the layout so it plays on each visit to PCOS care, not on every tab switch inside it.
export default function PcosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PcosIntro />
      {children}
    </>
  );
}
