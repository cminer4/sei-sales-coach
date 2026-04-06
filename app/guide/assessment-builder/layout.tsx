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
      className={`${dmSans.variable} ${dmSerif.variable} ab-wrap grid h-screen w-full grid-cols-[56px_minmax(0,1fr)] overflow-hidden`}
    >
      <AssessmentBuilderSidenav />
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden overflow-x-hidden bg-[#f7f6f4]">
        {children}
      </div>
    </div>
  );
}
