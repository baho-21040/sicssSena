import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { API_BASE_URL } from '../../config/api.js';

const InicioVigilante = () => {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [cameraStarted, setCameraStarted] = useState(false);
    const [accesosHoy, setAccesosHoy] = useState([]);
    const scannerRef = useRef(null);

    const API_URL = API_BASE_URL;

    // Cleanup al desmontar el componente
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Cargar accesos del día
    useEffect(() => {
        fetchAccesosHoy();
        const interval = setInterval(fetchAccesosHoy, 30000); // Actualizar cada 30s
        return () => clearInterval(interval);
    }, []);

    const fetchAccesosHoy = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/vigilante/accesos-hoy`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.status === 'ok') {
                setAccesosHoy(data.accesos || []);
            }
        } catch (err) {
            console.error('Error al cargar accesos:', err);
        }
    };

    const stopCamera = useCallback(() => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(() => { });
                }
            } catch (e) { /* ignore */ }
            scannerRef.current = null;
        }
        setCameraStarted(false);
    }, []);

    const openScanner = () => {
        setShowScanner(true);
        setScanResult(null);
        setError(null);
        setCameraStarted(false); // Reset camera state
    };

    const closeScanner = () => {
        stopCamera();
        setShowScanner(false);
        setScanResult(null);
        setError(null);
    };

    const resetScanner = () => {
        stopCamera();
        setError(null);
        setScanResult(null);
        // Pequeño delay para asegurar que la cámara se detuvo completamente
        setTimeout(() => {
            setCameraStarted(false);
        }, 100);
    };

    // Iniciar cámara cuando se abre el modal
    useEffect(() => {
        const readerElement = document.getElementById("reader");

        if (showScanner && !scanResult && readerElement && !cameraStarted) {
            stopCamera(); // Limpieza previa

            const scanner = new Html5Qrcode("reader");
            scannerRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            scanner.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                () => { }
            ).then(() => {
                console.log("Cámara iniciada");
                setCameraStarted(true);
            }).catch((err) => {
                console.error("Error al iniciar cámara:", err);
                setError("No se pudo acceder a la cámara");
            });
        }
    }, [showScanner, scanResult, cameraStarted]);

    const onScanSuccess = useCallback(async (decodedText) => {
        if (loading) return;

        stopCamera();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/vigilante/verificar-qr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_code: decodedText })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                setScanResult(data);
            } else {
                setError(data.message || 'Error al verificar el código QR');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    }, [API_URL, loading, stopCamera]);

    const handleRegistrarAcceso = async () => {
        if (!scanResult) return;

        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const id_vigilante = user?.id_usuario || 1;

            const response = await fetch(`${API_URL}/api/vigilante/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_aprobacion: scanResult.data.id_aprobacion,
                    tipo_acceso: scanResult.accion_requerida,
                    id_vigilante: id_vigilante
                })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                // Cerrar modal y actualizar tabla
                closeScanner();
                fetchAccesosHoy();
                // Mostrar notificación de éxito
                alert('✅ Acceso registrado correctamente');
            } else {
                setError(data.message || 'Error al registrar acceso');
            }
        } catch (err) {
            console.error(err);
            setError('Error al registrar el acceso');
        } finally {
            setLoading(false);
        }
    };

    const formatFecha = (fecha) => {
        if (!fecha) return '-';
        const d = new Date(fecha);
        return d.toLocaleString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <DashboardLayout headerTitle="Vigilancia SENA">
            <div className="min-h-screen bg-gray-100 p-6">
                {/* Header con botones de acción */}
                <div className="max-w-7xl mx-auto mb-6">
                    <div className="flex flex-wrap gap-4 justify-between items-center">
                        <h1 className="text-3xl font-bold text-[#2A7D00]">
                            <i className="fas fa-shield-alt mr-3"></i>
                            Panel de Vigilancia
                        </h1>
                        <div className="flex gap-3">
                            <Link
                                to="/vigilante/historial"
                                className="bg-white text-[#2A7D00] px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition shadow-md flex items-center gap-2 no-underline"
                            >
                                <i className="fas fa-history"></i>
                                Historial
                            </Link>
                            <Link
                                to="/vigilante/editarperfil"
                                className="bg-white text-[#2A7D00] px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition shadow-md flex items-center gap-2 no-underline"
                            >
                                <i className="fas fa-user-edit"></i>
                                Editar Perfil
                            </Link>
                            <button
                                onClick={openScanner}
                                className="bg-[#39A900] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#2A7D00] transition shadow-lg flex items-center gap-2"
                            >
                                <i className="fas fa-qrcode text-xl"></i>
                                Escanear QR
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabla de accesos del día */}
                <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-[#39A900] to-[#2A7D00] p-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <i className="fas fa-clipboard-list"></i>
                            Accesos Registrados Hoy
                        </h2>
                        <p className="text-white/90 mt-1">
                            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Hora</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Aprendiz</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Documento</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Tipo Acceso</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accesosHoy.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            <i className="fas fa-inbox text-5xl mb-3 block text-gray-300"></i>
                                            <p className="text-lg">No hay accesos registrados hoy</p>
                                            <p className="text-sm mt-1">Los accesos escaneados aparecerán aquí</p>
                                        </td>
                                    </tr>
                                ) : (
                                    accesosHoy.map((acceso, index) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                                {formatFecha(acceso.fecha_acceso)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                                                {acceso.aprendiz}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {acceso.documento}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${acceso.tipo_acceso === 'Salida'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {acceso.tipo_acceso === 'Salida' ? '🚪 Salida' : '🔙 Reingreso'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {acceso.motivo}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal del Escáner */}
                {showScanner && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
                            {/* Botón cerrar */}
                            <button
                                onClick={closeScanner}
                                className="absolute top-4 right-4 z-10 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold transition shadow-lg"
                                title="Cerrar"
                            >
                                ×
                            </button>

                            {/* Contenido del modal */}
                            <div className="p-8">
                                {!scanResult && !error && (
                                    <>
                                        <h2 className="text-2xl font-bold text-[#2A7D00] mb-6 text-center">
                                            <i className="fas fa-qrcode mr-2"></i>
                                            Escanear Código QR
                                        </h2>
                                        <div
                                            id="reader"
                                            style={{
                                                width: '100%',
                                                minHeight: '400px',
                                                position: 'relative'
                                            }}
                                            className="overflow-hidden rounded-lg border-4 border-[#39A900]"
                                        ></div>
                                        <p className="text-center text-gray-500 mt-4">
                                            Apunta la cámara al código QR del permiso
                                        </p>
                                        <style>{`
                                            #reader video {
                                                width: 100% !important;
                                                height: auto !important;
                                                display: block !important;
                                                border-radius: 8px;
                                            }
                                            #reader canvas {
                                                display: none !important;
                                            }
                                        `}</style>
                                    </>
                                )}

                                {/* Loading */}
                                {loading && (
                                    <div className="text-center py-12">
                                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#39A900] mx-auto mb-4"></div>
                                        <p className="text-lg font-semibold text-gray-700">Procesando...</p>
                                    </div>
                                )}

                                {/* Error */}
                                {error && (
                                    <div className="text-center py-8">
                                        <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                                            <i className="fas fa-times-circle text-4xl text-red-500"></i>
                                        </div>
                                        <h3 className="text-xl font-bold text-red-700 mb-2">Acceso Denegado</h3>
                                        <p className="text-red-600 mb-6">{error}</p>
                                        <button
                                            onClick={resetScanner}
                                            className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition"
                                        >
                                            Escanear Nuevamente
                                        </button>
                                    </div>
                                )}

                                {/* Resultado exitoso */}
                                {scanResult && (
                                    <div>
                                        <div className="bg-[#39A900] p-4 rounded-t-xl text-center -mx-8 -mt-8 mb-6">
                                            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                                                <i className="fas fa-check-circle"></i>
                                                {scanResult.mensaje}
                                            </h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Aprendiz</p>
                                                <p className="text-lg font-bold text-gray-900">{scanResult.data.aprendiz}</p>
                                                <p className="text-sm text-gray-600">{scanResult.data.documento}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Programa</p>
                                                <p className="text-sm font-semibold text-gray-800">{scanResult.data.programa}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Motivo</p>
                                                <p className="text-sm text-gray-800">{scanResult.data.motivo}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Horarios</p>
                                                <div className="flex gap-4">
                                                    <div>
                                                        <span className="text-xs font-bold text-red-500 block">SALIDA</span>
                                                        <span className="font-mono text-lg text-gray-900">{scanResult.data.hora_salida}</span>
                                                    </div>
                                                    {scanResult.data.hora_regreso !== 'No aplica' && (
                                                        <div>
                                                            <span className="text-xs font-bold text-green-500 block">REGRESO</span>
                                                            <span className="font-mono text-lg text-gray-900">{scanResult.data.hora_regreso}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleRegistrarAcceso}
                                                className="flex-1 bg-[#39A900] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#2A7D00] transition shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <i className="fas fa-check"></i>
                                                Confirmar {scanResult.accion_requerida}
                                            </button>
                                            <button
                                                onClick={closeScanner}
                                                className="px-6 bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-300 transition"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default InicioVigilante;