export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Don't wrap - let individual pages handle their own layout
  return <>{children}</>;
}
