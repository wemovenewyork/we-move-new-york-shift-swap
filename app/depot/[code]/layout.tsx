import InstallPrompt from "@/components/InstallPrompt";

// Wraps all post-login depot surfaces. InstallPrompt is mounted here (not in
// the root layout) so it never appears on the public teaser (/s/[id]).
export default function DepotLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <InstallPrompt />
    </>
  );
}
