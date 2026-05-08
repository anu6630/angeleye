export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* Navigation lives in root layout (AppNavigation) */
  return <>{children}</>;
}
