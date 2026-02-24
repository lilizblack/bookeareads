import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);
    const [permissionError, setPermissionError] = useState('');
    const [requesting, setRequesting] = useState(true);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let html5QrCode = null;

        const startScanner = async () => {
            try {
                // Initialize Html5Qrcode
                html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                };

                // Start scanning with the back camera (environment)
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        // Success callback
                        if (isMounted) {
                            onScanSuccess(decodedText);
                            stopScanner();
                        }
                    },
                    (errorMessage) => {
                        // Scan errors are common and can be ignored
                    }
                );

                if (isMounted) {
                    setRequesting(false);
                    setIsScanning(true);
                }
            } catch (error) {
                console.error("Scanner error:", error);
                if (isMounted) {
                    setRequesting(false);
                    if (error.toString().includes("NotAllowedError") || error.toString().includes("Permission denied")) {
                        setPermissionError('Camera permission denied. Please enable camera access in your browser settings.');
                    } else if (error.toString().includes("NotFoundError")) {
                        setPermissionError('No camera found on this device.');
                    } else {
                        setPermissionError('Failed to access camera: ' + error.message);
                    }
                }
            }
        };

        const stopScanner = async () => {
            if (html5QrCode && html5QrCode.isScanning) {
                try {
                    await html5QrCode.stop();
                } catch (err) {
                    console.warn("Failed to stop scanner:", err);
                }
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            if (isMounted) startScanner();
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            stopScanner();
        };
    }, [onScanSuccess]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative border border-slate-200 dark:border-slate-800">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition-all active:scale-90"
                >
                    <X size={20} />
                </button>

                <div className="p-6">
                    <div className="flex items-center gap-2 justify-center mb-6">
                        <Camera className="text-violet-500" size={20} />
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Scan Barcode</h3>
                    </div>

                    <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
                        <div id="reader" className="w-full h-full object-cover"></div>

                        {requesting && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900 z-10">
                                <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                                <p className="text-sm font-medium text-slate-500 animate-pulse">Accessing camera...</p>
                            </div>
                        )}

                        {permissionError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-900 z-10">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle size={24} />
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white mb-2">Camera Error</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{permissionError}</p>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                                >
                                    Go Back
                                </button>
                            </div>
                        ) || (
                                !requesting && isScanning && (
                                    <div className="absolute inset-0 pointer-events-none z-10 border-[16px] border-black/40">
                                        <div className="w-full h-full border-2 border-violet-500 animate-pulse-subtle"></div>
                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-scan-line"></div>
                                    </div>
                                )
                            )}
                    </div>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Position the barcode inside the frame
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                            Supports ISBN-10 & ISBN-13
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
