
import { AI } from '@/components/ai-chat';
import { AiModal } from '@/components/ai-panel';
import '../styles/global.css';
import { AuthProvider } from '@/components/authcontext';

export const metadata = {
  title: "Feira Bandim",
  description: "Bamdim na sua mão com IA ajudante",
};

export const viewport = {
  themeColor: '#FF7900',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>
        <AuthProvider>
          {children}
          <AiModal />
          <AI />
        </AuthProvider>
      </body>
    </html>
  );
}
