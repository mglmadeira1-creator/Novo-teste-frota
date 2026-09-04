import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    const scannerId = 'oficina-qr-reader';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 180 }, aspectRatio: 1.5 },
          (decodedText) => {
            onScan(decodedText);
            void scanner.stop().catch(() => undefined);
          },
          () => undefined
        );
      } catch (error) {
        console.error('[Oficina][QR] Falha ao iniciar camera', error);
        setScannerError('Não foi possível abrir a câmara. Confirma a permissão ou introduz o código manualmente.');
      } finally {
        setIsStarting(false);
      }
    };

    void startScanner();

    return () => {
      if (scanner.isScanning) {
        void scanner.stop().catch(() => undefined);
      }
      scanner.clear();
      scannerRef.current = null;
    };
  }, [onScan]);

  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-slate-950 p-4 shadow-inner shadow-cyan-950/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-sm font-semibold text-slate-100">Ler cartão com a câmara</p>
            <p className="text-xs text-slate-400">Aponte para o QR Code do cartão.</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:bg-slate-800">
          <CameraOff className="h-4 w-4" />
          Fechar
        </button>
      </div>

      <div id="oficina-qr-reader" className="overflow-hidden rounded-xl border border-slate-700 bg-black" />
      {isStarting && <p className="mt-3 text-center text-xs text-slate-400">A abrir a câmara...</p>}
      {scannerError && <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">{scannerError}</p>}
    </div>
  );
};
