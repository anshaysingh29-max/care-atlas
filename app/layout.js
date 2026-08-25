import './globals.css';
import './phase6d.css';
import './phase6e.css';
import './phase6f.css';
import './phase7a.css';
import './phase7b.css';
import './phase7c.css';
import './phase7d.css';
import './phase7e.css';
import './phase7f.css';
import './phase7g.css';
import './phase8a.css';
import './phase8b.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';
import ReferralCapture from '@/components/ReferralCapture';

export const metadata = {
  title: 'CareAtlas — Healthcare without borders',
  description: 'Explore international treatment options, trusted hospitals and specialist care with CareAtlas.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ReferralCapture />
          <Header />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
