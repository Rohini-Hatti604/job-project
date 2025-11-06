import './globals.css'
export const metadata = {
  title: 'Job Importer Admin',
  description: 'View import history and trigger imports'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen p-6">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </body>
    </html>
  );
}


