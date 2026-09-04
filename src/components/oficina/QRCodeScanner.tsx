import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    const scannerId = 'oficina-qr-reader';
    const scanner = new Html5Qrcode(scannerId, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    });
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        const rearCamera = cameras.find((camera) => /back|rear|environment|traseira|tras/i.test(camera.label));
        const camera = rearCamera?.id || cameras[0]?.id;

        if (!camera) {
          throw new Error('Nenhuma câmara encontrada.');
        }

        await scanner.start(
          camera,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.78);
              return { width: Math.max(220, size), height: Math.max(220, size) };
            },
            aspectRatio: 1,
            disableFlip: false
          },
          (decodedText) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
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

  const handleImageScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !scannerRef.current) return;

    try {
      const decodedText = await scannerRef.current.scanFile(file, true);
      onScan(decodedText);
    } catch {
      setScannerError('Não foi possível ler o QR Code da imagem. Usa uma fotografia nítida e bem iluminada.');
    }
  };

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
      <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-700 px-4 text-sm text-slate-300 hover:bg-slate-800">
        Ler QR a partir de fotografia
        <input type="file" accept="image/*" capture="environment" onChange={handleImageScan} className="sr-only" />
      </label>
      {isStarting && <p className="mt-3 text-center text-xs text-slate-400">A abrir a câmara traseira e a procurar um QR Code...</p>}
      {scannerError && <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">{scannerError}</p>}
    </div>
  );
};
