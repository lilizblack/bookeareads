import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
    const [permissionError, setPermissionError] = useState('');
    const [requesting, setRequesting] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const scannerRef = useRef(null);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch (err) {
                console.warn("Failed to stop scanner:", err);
            }
        }
    }, []);

    const startScanner = useCallback(async (cameraIdOrConfig) => {
        try {
            setRequesting(true);
            setPermissionError('');

            // If a scanner already exists, stop it first
            await stopScanner();

            // Initialize Html5Qrcode if not already done
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader");
            }

            // ISBN is EAN-13, EAN-8, or UPC-A/E
            const config = {
                fps: 15,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    // Wider box for 1D barcodes (ISBNs are long strings)
                    const width = Math.min(viewfinderWidth * 0.85, 400);
                    const height = Math.min(viewfinderHeight * 0.3, 160);
                    return { width, height };
                },
                aspectRatio: 1.0,
                // Explicitly support 1D barcodes for ISBN
                formatsToSupport: [ 
                    0, // QR_CODE
                    5, // EAN_13 (Main ISBN-13 format)
                    6, // EAN_8
                    9, // UPC_A
                    10, // UPC_E
                    11, // UPC_EAN_EXTENSION
                    1 // AZTEC
                ],
                // Suggest camera focus and resolution
                videoConstraints: {
                    facingMode: "environment",
                    focusMode: "continuous",
                    width: { min: 640 },
                    height: { min: 480 }
                }
            };

            await scannerRef.current.start(
                cameraIdOrConfig,
                config,
                (decodedText) => {
                    onScanSuccess(decodedText);
                    stopScanner();
                },
                () => {
                    // Ignore individual scan errors
                }
            );

            setIsScanning(true);
            setRequesting(false);
        } catch (error) {
            console.error("Scanner error:", error);
            setRequesting(false);
            const errorStr = error.toString();
            if (errorStr.includes("NotAllowedError") || errorStr.includes("Permission denied")) {
                setPermissionError('Camera permission denied. Please enable camera access.');
            } else if (errorStr.includes("NotFoundError")) {
                setPermissionError('No camera found on this device.');
            } else if (errorStr.includes("is already scanning")) {
                // Ignore if it's already running
            } else {
                setPermissionError('Failed to access camera. Try reloading the app.');
            }
        }
    }, [onScanSuccess, stopScanner]);

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            try {
                // Request permissions and get cameras
                const devices = await Html5Qrcode.getCameras();
                if (isMounted) {
                    if (devices && devices.length > 0) {
                        setCameras(devices);
                        // Try to find the back camera
                        const backCameraIndex = devices.findIndex(d => 
                            d.label.toLowerCase().includes('back') || 
                            d.label.toLowerCase().includes('environment') ||
                            d.label.toLowerCase().includes('rear') ||
                            d.label.toLowerCase().includes('0') // Often 0 is back on android
                        );
                        
                        // Select back camera or the last one in the list
                        const initialIndex = backCameraIndex !== -1 ? backCameraIndex : devices.length - 1;
                        setCurrentCameraIndex(initialIndex);
                        startScanner(devices[initialIndex].id);
                    } else {
                        // Fallback to environment facing mode
                        startScanner({ facingMode: "environment" });
                    }
                }
            } catch (err) {
                console.warn("Camera enumeration failed, falling back to facingMode constraints", err);
                if (isMounted) {
                    startScanner({ facingMode: "environment" });
                }
            }
        };

        // Delay to allow DOM focus if modal is animating
        const timer = setTimeout(init, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            stopScanner();
        };
    }, [startScanner, stopScanner]);

    const switchCamera = () => {
        if (cameras.length < 2) return;
        const nextIndex = (currentCameraIndex + 1) % cameras.length;
        setCurrentCameraIndex(nextIndex);
        startScanner(cameras[nextIndex].id);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative border border-slate-200 dark:border-slate-800">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition-all active:scale-90"
                >
                    <X size={20} />
                </button>

                <div className="p-6">
                    <div className="flex items-center gap-2 justify-center mb-6">
                        <Camera className="text-violet-500" size={20} />
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg font-display">Scan Barcode</h3>
                    </div>

                    <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center">
                        <div id="reader" className="w-full h-full object-cover"></div>

                        {requesting && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900 z-10">
                                <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                                <p className="text-sm font-semibold text-slate-500 animate-pulse">Initializing Scanner...</p>
                            </div>
                        )}

                        {permissionError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-900 z-10">
                                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle size={28} />
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white mb-2 font-display">Access Required</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-4 leading-relaxed">{permissionError}</p>
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-sm font-black active:scale-95 transition-transform"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) || (
                            !requesting && isScanning && (
                                <div className="absolute inset-0 pointer-events-none z-10">
                                    {/* Crosshair Overlay */}
                                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-44 border-2 border-violet-500 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-pulse-subtle">
                                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-violet-500 rounded-tl-lg"></div>
                                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-violet-500 rounded-tr-lg"></div>
                                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-violet-500 rounded-bl-lg"></div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-violet-500 rounded-br-lg"></div>
                                    </div>
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-scan-line"></div>
                                </div>
                            )
                        )}
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-4">
                        {cameras.length > 1 && !permissionError && (
                            <button
                                onClick={switchCamera}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
                            >
                                <RefreshCw size={16} className={requesting ? 'animate-spin' : ''} />
                                Switch Camera
                            </button>
                        )}
                        
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-700 dark:text-white mb-1 font-display">
                                Position Barcode in Frame
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black">
                                Supports ISBN-10 & ISBN-13
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;

