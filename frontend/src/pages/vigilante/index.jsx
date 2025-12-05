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
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedAcceso, setSelectedAcceso] = useState(null);
    const [cameraStarted, setCameraStarted] = useState(false);
    const [accesosHoy, setAccesosHoy] = useState([]);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const scannerRef = useRef(null);

    const API_URL = API_BASE_URL;

    const motivosMap = {
        'cita_medica': 'Cita o incapacidad médica',
        'electoral': 'Citaciones a diligencias electorales y/o gubernamentales',
        'laboral': 'Requerimientos o compromisos laborales',
        'fuerza_mayor': 'Casos fortuitos o de fuerza mayor',
        'etapa_productiva': 'Trámites de etapa productiva',
        'representacion_sena': 'Autorización para asistir en representación del SENA',
        'diligencia_judicial': 'Citación a diligencias judiciales'
    };

    const getDescripcionCompleta = (acceso) => {
        if (!acceso) return '-';
        if (acceso.descripcion_permiso && acceso.descripcion_permiso !== 'VACIO') {
            return acceso.descripcion_permiso;
        }
        return motivosMap[acceso.motivo] || acceso.motivo || '-';
    };

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

    const openDetailsModal = (acceso) => {
        setSelectedAcceso(acceso);
        setShowDetailsModal(true);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedAcceso(null);
    };

    const openImageModal = (imageUrl) => {
        setSelectedImage(imageUrl);
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
        setSelectedImage(null);
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
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/vigilante/verificar-qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_URL}/api/vigilante/registrar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
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
                        <div className="flex gap-3 flex-wrap justify-end w-full md:w-auto">
                            <Link
                                to="/vigilante/historial"
                                className="bg-white text-[#2A7D00] px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition shadow-md flex items-center gap-2 no-underline flex-1 md:flex-none justify-center"
                            >
                                <i className="fas fa-history"></i>
                                Historial
                            </Link>
                            <Link
                                to="/vigilante/editarperfil"
                                className="bg-white text-[#2A7D00] px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition shadow-md flex items-center gap-2 no-underline flex-1 md:flex-none justify-center"
                            >
                                <i className="fas fa-user-edit"></i>
                                Editar Perfil
                            </Link>
                            <button
                                onClick={openScanner}
                                className="bg-[#39A900] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#2A7D00] transition shadow-lg flex items-center gap-2 max-[530px]:w-full max-[515px]:justify-center max-[530px]text-center"
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
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3  max-[430px]:text-lg">
                            <i className="fas fa-clipboard-list"></i>
                            Accesos Registrados Hoy
                        </h2>
                        <p className="text-white/90 mt-1">
                            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {/* Vista de Tabla (Pantallas grandes) */}
                    <div className="hidden min-[700px]:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Hora</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Aprendiz</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Documento</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Tipo Acceso</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Ver más</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accesosHoy.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
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
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${!acceso.hora_regreso
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-purple-100 text-purple-700'
                                                    }`}>
                                                    {!acceso.hora_regreso ? 'Salida' : 'Sale y re-ingresa'}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => openDetailsModal(acceso)}
                                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition shadow-sm flex items-center gap-2"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                    Detalles
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista de Tarjetas (Pantallas pequeñas < 700px) */}
                    <div className="block min-[700px]:hidden p-4 space-y-4">
                        {accesosHoy.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <i className="fas fa-inbox text-5xl mb-3 block text-gray-300"></i>
                                <p className="text-lg">No hay accesos registrados hoy</p>
                            </div>
                        ) : (
                            accesosHoy.map((acceso, index) => (
                                <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                                    {/* Fila 1: Aprendiz | Documento | Ver más */}
                                    <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                                        <div className="flex flex-col flex-1 mr-2">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase ">Aprendiz</span>
                                            <span className="text-xs font-semibold text-gray-900 truncate" title={acceso.aprendiz}>{acceso.aprendiz}</span>
                                            <span className="text-xs text-gray-600 mt-1">{acceso.documento}</span>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => openDetailsModal(acceso)}
                                                className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 transition shadow-sm flex items-center gap-1"
                                            >
                                                <i className="fas fa-eye"></i>
                                                Ver más
                                            </button>
                                        </div>
                                    </div>

                                    {/* Fila 2: Hora | Tipo de Acceso | Horarios */}
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase">Hora de Escaneo</span>
                                            <span className="text-sm font-medium text-gray-700">{formatFecha(acceso.fecha_acceso)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Tipo Acceso</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${!acceso.hora_regreso
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                {!acceso.hora_regreso ? 'Salida' : 'Sale y re ingresa'}
                                            </span>
                                        </div>

                                        {/* Horarios adicionales */}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase">Hora Salida</span>
                                            <span className="text-sm text-gray-700 font-mono">{acceso.hora_salida || '-'}</span>
                                        </div>

                                        {acceso.hora_regreso && acceso.hora_regreso !== 'No aplica' && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase">Hora Entrada</span>
                                                <span className="text-sm text-gray-700 font-mono">{acceso.hora_regreso}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Modal de Detalles */}
                {showDetailsModal && selectedAcceso && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 py-26 px-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto relative mt-28">
                            {/* Botón cerrar */}
                            <button
                                onClick={closeDetailsModal}
                                className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full flex items-center justify-center text-2xl font-bold transition shadow-lg"
                                title="Cerrar"
                            >
                                ×
                            </button>

                            {/* Contenido del modal */}
                            <div className="p-8">
                                <h2 className="text-2xl font-bold text-[#2A7D00] mb-6 text-center">
                                    <i className="fas fa-info-circle mr-2"></i>
                                    Detalles del Acceso
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {/* Aprendiz */}
                                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Aprendiz</p>
                                        <p className="text-lg font-bold text-gray-900">{selectedAcceso.aprendiz}</p>
                                        <p className="text-sm text-gray-600">{selectedAcceso.documento}</p>
                                    </div>

                                    {/* Instructor y Coordinación */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Instructor</p>
                                        <p className="text-sm font-semibold text-gray-800">{selectedAcceso.instructor || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Coordinación</p>
                                        <p className="text-sm font-semibold text-gray-800">{selectedAcceso.coordinador || 'N/A'}</p>
                                    </div>

                                    {/* Programa, Ficha, Jornada */}
                                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Programa</p>
                                        <p className="text-sm font-semibold text-gray-800">{selectedAcceso.nombre_programa || 'N/A'}</p>
                                        <div className="flex gap-4 mt-2">
                                            <div>
                                                <span className="text-xs text-gray-500 uppercase font-semibold">Ficha: </span>
                                                <span className="text-sm font-semibold text-gray-800">{selectedAcceso.numero_ficha || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500 uppercase font-semibold">Jornada: </span>
                                                <span className="text-sm font-semibold text-gray-800">{selectedAcceso.nombre_jornada || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Motivo (Descripción) */}
                                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Motivo</p>
                                        <p className="text-sm text-gray-800">{getDescripcionCompleta(selectedAcceso)}</p>
                                    </div>

                                    {/* Archivo Adjunto */}
                                    {selectedAcceso.soporte && (
                                        <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Archivo Adjunto</p>
                                            <button
                                                onClick={() => openImageModal(`${API_URL}/${selectedAcceso.soporte}`)}
                                                className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-2 bg-transparent border-0 cursor-pointer"
                                            >
                                                <i className="fas fa-paperclip"></i>
                                                Ver Soporte
                                            </button>
                                        </div>
                                    )}

                                    {/* Horarios */}
                                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Horarios</p>
                                        <div className="flex gap-4">
                                            <div>
                                                <span className="text-xs font-bold text-red-500 block">SALIDA</span>
                                                <span className="font-mono text-lg text-gray-900">{selectedAcceso.hora_salida || 'N/A'}</span>
                                            </div>
                                            {selectedAcceso.hora_regreso && selectedAcceso.hora_regreso !== 'No aplica' && (
                                                <div>
                                                    <span className="text-xs font-bold text-green-500 block">REGRESO</span>
                                                    <span className="font-mono text-lg text-gray-900">{selectedAcceso.hora_regreso}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={closeDetailsModal}
                                        className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal del Escáner */}
                {showScanner && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50  py-26 px-4 ">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto relative mt-[50px]">
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
                                                transform: scaleX(-1);
                                            }
                                            #reader canvas {
                                                display: none !important;
                                            }
                                            #reader__scan_region {
                                                min-width: 250px !important;
                                                min-height: 250px !important;
                                                width: 250px !important;
                                                height: 250px !important;
                                            }
                                            #reader__dashboard_section_csr span {
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
                                            {/* Aprendiz */}
                                            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Aprendiz</p>
                                                <p className="text-lg font-bold text-gray-900">{scanResult.data.aprendiz}</p>
                                                <p className="text-sm text-gray-600">{scanResult.data.documento}</p>
                                            </div>

                                            {/* Instructor y Coordinación */}
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Instructor</p>
                                                <p className="text-sm font-semibold text-gray-800">{scanResult.data.instructor}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Coordinación</p>
                                                <p className="text-sm font-semibold text-gray-800">{scanResult.data.coordinador}</p>
                                            </div>

                                            {/* Programa, Ficha, Jornada */}
                                            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Programa</p>
                                                <p className="text-sm font-semibold text-gray-800">{scanResult.data.programa}</p>
                                                <div className="flex gap-4 mt-2">
                                                    <div>
                                                        <span className="text-xs text-gray-500 uppercase font-semibold">Ficha: </span>
                                                        <span className="text-sm font-semibold text-gray-800">{scanResult.data.ficha}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-500 uppercase font-semibold">Jornada: </span>
                                                        <span className="text-sm font-semibold text-gray-800">{scanResult.data.jornada}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Motivo (Descripción) */}
                                            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Motivo</p>
                                                <p className="text-sm text-gray-800">{getDescripcionCompleta(scanResult.data)}</p>
                                            </div>

                                            {/* Archivo Adjunto */}
                                            {scanResult.data.soporte && (
                                                <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Archivo Adjunto</p>
                                                    <button
                                                        onClick={() => openImageModal(`${API_URL}/${scanResult.data.soporte}`)}
                                                        className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-2 bg-transparent border-0 cursor-pointer"
                                                    >
                                                        <i className="fas fa-paperclip"></i>
                                                        Ver Soporte
                                                    </button>
                                                </div>
                                            )}

                                            {/* Horarios */}
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

                {/* Modal de Imagen */}
                {showImageModal && selectedImage && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={closeImageModal}>
                        <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={closeImageModal}
                                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-4xl font-bold transition"
                                title="Cerrar"
                            >
                                &times;
                            </button>
                            <img
                                src={selectedImage}
                                alt="Soporte"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white"
                            />
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
};

export default InicioVigilante;