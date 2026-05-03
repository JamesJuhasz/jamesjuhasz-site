/*
  /studio gets its own layout to bypass the site chrome (header/footer/CTAs).
  The studio renders full-bleed, owns the html/body styling.
*/

export const metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
