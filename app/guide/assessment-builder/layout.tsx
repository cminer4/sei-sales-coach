import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import { AssessmentBuilderSidenav } from '@/components/assessment-builder/AssessmentBuilderSidenav';
import './assessment-builder.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-ab-sans',
  display: 'swap',
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-ab-serif',
  display: 'swap',
});

export default function AssessmentBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${dmSans.variable} ${dmSerif.variable} ab-wrap flex min-h-screen w-full overflow-hidden`}
    >
      <AssessmentBuilderSidenav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-[#f7f6f4]">
        {children}
      </div>
    </div>
  );
}
