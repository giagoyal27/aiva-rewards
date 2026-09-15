import { AivaWordmark } from "@/components/ui";

export default function QrPrintPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16 print:py-0">
      <div className="text-center">
        <AivaWordmark className="justify-center mb-4" />
        <p className="text-aiva-muted text-sm mb-8">Scan to join AIVA Rewards</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/api/qr" alt="AIVA Rewards QR code" width={320} height={320} className="mx-auto rounded-2xl border border-aiva-line" />
        <p className="text-xs text-aiva-muted mt-6 max-w-xs mx-auto">
          This is the single common QR code printed on every physical AIVA loyalty card. It opens the AIVA Rewards
          login page — each customer's unique Card Number identifies their account.
        </p>
      </div>
    </main>
  );
}
