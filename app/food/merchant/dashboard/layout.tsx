// app/layout.tsx or app/food/merchant/dashboard/layout.tsx
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}