import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);
    const [permissionError, setPermissionError] = useState('');
    const [requesting, setRequesting] = useState(true);

    useEffect(() => {
        let scanner = null;

        const initScanner = async () => {
            try {
                // Check if we are in a secure context or have mediaDevices
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setRequesting(false);
                    setPermissionError('Camera access requires a secure connection (HTTPS). Please access the app via https:// or use localhost.');
                    return;
                }

                // Explicitly request camera permission first
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });

                // Stop the stream immediately - we just needed permission
                stream.getTracks().forEach(track => track.stop());

                setRequesting(false);

                // Now initialize the scanner
                scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 150 },
                        aspectRatio: 1.0
                    },
                    /* verbose= */ false
                );

                scanner.render(
                    (decodedText) => {
                        onScanSuccess(decodedText);
                        scanner.clear();
                    },
                    (error) => {
                        // Handle or ignore scanning errors
                    }
                );

                scannerRef.current = scanner;

            } catch (error) {
                setRequesting(false);
                if (error.name === 'NotAllowedError') {
                    setPermissionError('Camera permission denied. Please enable camera access in your browser settings.');
                } else if (error.name === 'NotFoundError') {
                    setPermissionError('No camera found on this device.');
                } else {
                    setPermissionError('Failed to access camera: ' + error.message);
                }
            }
        };

        initScanner();

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner. ", error);
                });
            }
        };
    }, [onScanSuccess]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-4 pt-12">
                    <h3 className="text-center font-bold text-slate-800 dark:text-white mb-4">Scan Barcode</h3>

                    {requesting && (
                        <div className="text-center py-8">
                            <p className="text-slate-600 dark:text-slate-400">Requesting camera permission...</p>
                        </div>
                    )}

                    {permissionError && (
                        <div className="text-center py-8">
                            <p className="text-red-500 text-sm mb-4">{permissionError}</p>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
                            >
                                Close
                            </button>
                        </div>
                    )}

                    {!requesting && !permissionError && (
                        <>
                            <div id="reader" className="w-full rounded-lg overflow-hidden"></div>
                            <p className="text-center text-xs text-slate-400 mt-4">
                                Point camera at the ISBN barcode on the back of the book.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
