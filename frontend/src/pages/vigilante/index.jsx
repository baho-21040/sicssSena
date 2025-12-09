import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { API_BASE_URL } from '../../config/api.js';
import "remixicon/fonts/remixicon.css";

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
    const [showToast, setShowToast] = useState(false);
    const scannerRef = useRef(null);

    const API_URL = API_BASE_URL;

    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

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
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
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

    const stopCamera = useCallback(async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) {
                console.warn("Error stopping camera", e);
            }
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

    const closeScanner = async () => {
        await stopCamera();
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

    const resetScanner = async () => {
        await stopCamera();
        setError(null);
        setScanResult(null);
        // Pequeño delay para asegurar que la cámara se detuvo completamente
        setTimeout(() => {
            setCameraStarted(false);
        }, 300);
    };

    // Iniciar cámara cuando se abre el modal
    useEffect(() => {
        const readerElement = document.getElementById("reader");

        // Solo intentar iniciar si el elemento existe y no hay resultado ni error pendiente
        if (showScanner && !scanResult && !error && readerElement && !cameraStarted) {
            const startScanner = async () => {
                // Limpieza previa asegurada
                await stopCamera();

                // Delay para liberar hardware
                await new Promise(resolve => setTimeout(resolve, 300));

                // Verificar nuevamente si el componente sigue montado y en estado correcto
                if (!document.getElementById("reader")) return;

                const scanner = new Html5Qrcode("reader");
                scannerRef.current = scanner;

                const config = {
                    fps: 10,
                    qrbox: { width: 300, height: 300 },
                    aspectRatio: 1.0
                };

                try {
                    await scanner.start(
                        { facingMode: "environment" },
                        config,
                        onScanSuccess,
                        () => { }
                    );
                    console.log("Cámara iniciada");
                    setCameraStarted(true);
                } catch (err) {
                    console.error("Error al iniciar cámara:", err);
                    setError("No se pudo acceder a la cámara. Verifique permisos o cierre otras apps.");
                    setCameraStarted(false);
                }
            };

            startScanner();
        }
    }, [showScanner, scanResult, error, cameraStarted, stopCamera]);

    const onScanSuccess = useCallback(async (decodedText) => {
        if (loading) return;

        await stopCamera();
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
                // Cerrar modal APENAS sea exitoso para UX inmediata
                await closeScanner();
                fetchAccesosHoy();
                // Mostrar TOAST en lugar de alert
                setShowToast(true);
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

    const formatTime12h = (timeStr) => {
        if (!timeStr) return 'N/A';
        // Si viene como fecha completa
        if (timeStr.includes('T') || timeStr.includes('-')) {
            const d = new Date(timeStr);
            return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        // Si viene como HH:mm:ss
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'p.m.' : 'a.m.';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    return (
        <DashboardLayout headerTitle="Vigilancia SENA">
            <div className="min-h-screen bg-gray-100 p-6 relative">
                {/* Toast Notification Moderno */}
                {showToast && (
                    <div className="fixed top-24 right-6 z-50 animate-[slideIn_0.3s_ease-out]">
                        <div className="bg-white/90 backdrop-blur-md border border-green-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-4 flex items-center gap-4 min-w-[340px] border-l-[6px] border-l-[#39A900]">
                            <div className="bg-gradient-to-br from-[#39A900] to-[#2A7D00] p-3 rounded-xl shadow-lg shadow-green-200">
                                <i className="fas fa-check text-white text-lg"></i>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-extrabold text-[#2A7D00] text-sm leading-tight">¡Escaneo Exitoso!</h4>
                                <p className="text-gray-500 text-xs font-medium mt-0.5">El registro se guardó correctamente.</p>
                            </div>
                            <button
                                onClick={() => setShowToast(false)}
                                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                )}
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 py-26 px-2">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto relative mt-[50px]">
                            {/* Botón cerrar */}
                            <button
                                onClick={closeDetailsModal}
                                className="absolute top-2 right-2 z-10 w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-[2px] rounded-tr-[12px] flex items-center justify-center text-2xl font-bold transition "
                                title="Cerrar"
                            >
                                ×
                            </button>

                            {/* Contenido del modal */}
                            <div className="p-4">
                                <h2 className="text-xl font-bold text-[#2A7D00] mb-3">
                                    <i className="fas fa-info-circle mr-2"></i>
                                    Detalles del Acceso
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                    {/* Aprendiz */}
                                    <div className="bg-gray-50 p-2.5 rounded-lg md:col-span-2 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Aprendiz</p>
                                            <p className="text-xs font-bold text-gray-900">{selectedAcceso.aprendiz}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1 text-center">Documento</p>
                                            <p className="text-xs text-gray-600 font-mono text-center">{selectedAcceso.documento}</p>
                                        </div>
                                    </div>

                                    {/* Instructor y Coordinación - En la misma fila siempre */}
                                    <div className="md:col-span-2 grid grid-cols-2 gap-2">
                                        <div className="bg-gray-50 p-2.5 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Instructor</p>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-gray-800">{selectedAcceso.nombre_instructor || 'N/A'}</span>
                                                <span className="text-xs text-gray-700">{selectedAcceso.apellido_instructor || ''}</span>
                                                <span className="text-xs text-gray-500 mt-1">{selectedAcceso.documento_instructor || ''}</span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-2.5 rounded-lg flex flex-col ">
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-2 w-full text-left">Coordinación</p>
                                            <div className="flex flex-col ">
                                                <span className="text-xs font-semibold text-gray-800">{selectedAcceso.nombre_coordinador || 'N/A'}</span>
                                                <span className="text-xs text-gray-700">{selectedAcceso.apellido_coordinador || ''}</span>
                                                <span className="text-xs text-gray-500 mt-1">{selectedAcceso.documento_coordinador || ''}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Programa, Ficha, Jornada */}
                                    <div className="bg-gray-50 p-2.5 rounded-lg md:col-span-2 grid grid-cols-10 gap-2">
                                        <div className="col-span-6">
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Programa</p>
                                            <p className="text-[10px] font-semibold text-gray-800">{selectedAcceso.nombre_programa || 'N/A'}</p>
                                        </div>
                                        <div className="flex flex-col gap-2 col-span-4">
                                            <div className="flex gap-1">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Ficha:</p>
                                                <p className="text-xs font-semibold text-gray-800">{selectedAcceso.numero_ficha || 'N/A'}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Jornada:</p>
                                                <p className="text-xs font-semibold text-gray-800">{selectedAcceso.nombre_jornada || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Motivo (Descripción) */}
                                    <div className="bg-gray-50 p-2.5 rounded-lg md:col-span-2">
                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Motivo</p>
                                        <p className="text-xs text-gray-800">{getDescripcionCompleta(selectedAcceso)}</p>
                                    </div>

                                    {/* Soporte y Horarios */}
                                    {selectedAcceso.soporte ? (
                                        <div className="md:col-span-2 grid grid-cols-10 gap-2">
                                            <div className="bg-gray-50 p-2.5 rounded-lg flex flex-col  col-span-4">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Soporte</p>
                                                <button
                                                    onClick={() => openImageModal(`${API_URL}/${selectedAcceso.soporte}`)}
                                                    className="text-blue-600 hover:text-blue-800 underline text-xs flex  gap-2 bg-transparent border-0 cursor-pointer"
                                                >
                                                    <i className="fas fa-paperclip"></i>
                                                    Ver Soporte
                                                </button>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-lg flex flex-col  col-span-6">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-2 w-full text-left">Horarios</p>
                                                <div className="flex flex-col gap-1 w-full max-w-[150px]">
                                                    <div className="flex justify-between">
                                                        <span className="text-[10px] font-bold text-red-500">SALIDA:</span>
                                                        <span className="font-mono text-[12px] text-gray-900">{formatTime12h(selectedAcceso.hora_salida)}</span>
                                                    </div>
                                                    {selectedAcceso.hora_regreso && selectedAcceso.hora_regreso !== 'No aplica' && (
                                                        <div className="flex justify-between">
                                                            <span className="text-[10px] font-bold text-green-500">REGRESO:</span>
                                                            <span className="font-mono text-[12px] text-gray-900">{formatTime12h(selectedAcceso.hora_regreso)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 flex flex-col">
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-2 w-full text-left">Horarios</p>
                                            <div className="flex gap-4  w-full">
                                                <div>
                                                    <span className="text-[10px] font-bold text-red-500 block mb-1 ">SALIDA</span>
                                                    <span className="font-mono text-sm text-gray-900">{formatTime12h(selectedAcceso.hora_salida)}</span>
                                                </div>
                                                {selectedAcceso.hora_regreso && selectedAcceso.hora_regreso !== 'No aplica' && (
                                                    <div>
                                                        <span className="text-xs font-bold text-green-500 block mb-1 ">REGRESO</span>
                                                        <span className="font-mono text-sm text-gray-900">{formatTime12h(selectedAcceso.hora_regreso)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={closeDetailsModal}
                                        className="px-6 bg-gray-200 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-300 transition text-xs"
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50  py-26 px-2 ">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto relative mt-[50px]">
                            {/* Botón cerrar */}
                            <button
                                onClick={closeScanner}
                                className="absolute top-2 right-2 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-[5px] rounded-tr-[12px] flex items-center justify-center text-2xl font-bold transition shadow-lg"
                                title="Cerrar"
                            >
                                ×
                            </button>

                            {/* Contenido del modal */}
                            <div className="p-4">
                                {/* Título siempre visible */}
                                {!scanResult && !error && (
                                    <h2 className="text-2xl font-bold text-[#2A7D00] mb-6 text-center">
                                        <i className="fas fa-qrcode mr-2"></i>
                                        Escanear Código QR
                                    </h2>
                                )}

                                {/* Contenedor del escáner - SIEMPRE RENDERIZADO pero oculto si hay resultado/error */}
                                <div
                                    style={{
                                        display: (!scanResult && !error) ? 'flex' : 'none',
                                        width: '100%',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <div
                                        id="reader"
                                        style={{
                                            width: '100%',
                                            maxWidth: '300px',
                                            aspectRatio: '1/1',
                                            overflow: 'hidden',
                                            borderRadius: '0.5rem',
                                            border: '4px solid #39A900',
                                            position: 'relative'
                                        }}
                                    ></div>
                                </div>

                                {!scanResult && !error && (
                                    <>
                                        <p className="text-center text-gray-500 mt-4">
                                            Apunta la cámara al código QR del permiso
                                        </p>
                                        <style>{`
                                            #reader video {
                                                width: 100% !important;
                                                height: 100% !important;
                                                object-fit: cover !important;
                                                display: block !important;
                                                border-radius: 8px;
                                                transform: scaleX(-1);
                                            }
                                            #reader canvas {
                                                display: none !important;
                                            }
                                            #reader__scan_region {
                                                width: 75% !important;
                                                max-width: 300px !important;
                                                aspect-ratio: 1/1 !important;
                                                min-width: unset !important;
                                                min-height: unset !important;
                                                height: auto !important;
                                                box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5), 0 0 0 1000px rgba(0, 0, 0, 0.5) !important;
                                                border: 2px solid white !important;
                                            }
                                            #reader__dashboard_section_csr span {
                                                display: none !important;
                                            }
                                            @media (max-width: 550px) {
                                                #reader__scan_region {
                                                    width: 85% !important;
                                                }
                                            }
                                        `}</style>
                                    </>
                                )}

                                {/* Loading eliminado visualmente como se solicitó, mantenemos el estado lógico pero sin feedback visual intrusivo */}

                                {/* Error */}
                                {error && (
                                    <div className="text-center py-8">
                                        <div className="bg-red-50 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-pulse">
                                            <i className="ri-close-circle-line text-4xl text-red-500"></i>
                                        </div>
                                        <h3 className="text-xl font-bold text-red-700 mb-2">Acceso Denegado</h3>
                                        <p className="text-red-600 mb-6 px-4">{error}</p>
                                        <button
                                            onClick={resetScanner}
                                            className="bg-red-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                        >
                                            Intentar de nuevo
                                        </button>
                                    </div>
                                )}

                                {/* Resultado exitoso */}
                                {scanResult && (
                                    <div>
                                        <div className="bg-[#39A900] py-3 px-8 rounded-t-xl -mx-4 -mt-4 mb-2">
                                            <h2 className="text-xl font-bold text-white  justify-center gap-2">
                                                <i className="fas fa-check-circle"></i>
                                                {scanResult.mensaje}
                                            </h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                            {/* Aprendiz */}
                                            <div className="bg-gray-50 p-2.5 rounded-lg md:col-span-2 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Aprendiz</p>
                                                    <p className="text-xs font-bold text-gray-900">{scanResult.data.aprendiz}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1 text-center">Documento</p>
                                                    <p className="text-xs text-gray-600 font-mono text-center">{scanResult.data.documento}</p>
                                                </div>
                                            </div>

                                            {/* Instructor y Coordinación */}
                                            <div className="md:col-span-2 grid grid-cols-2 gap-2">
                                                <div className="bg-gray-50 p-2.5 rounded-lg">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Instructor</p>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-gray-800">{scanResult.data.instructor || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-2.5 rounded-lg flex flex-col ">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 w-full text-left">Coordinación</p>
                                                    <div className="flex flex-col ">
                                                        <span className="text-xs font-semibold text-gray-800">{scanResult.data.coordinador || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Programa, Ficha, Jornada */}
                                            <div className="bg-gray-50 p-2.5 rounded-lg md:col-span-2 grid grid-cols-10 gap-2">
                                                <div className="col-span-6">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Programa</p>
                                                    <p className="text-[10px] font-semibold text-gray-800">{scanResult.data.programa || 'N/A'}</p>
                                                </div>
                                                <div className="flex flex-col gap-2 col-span-4">
                                                    <div className="flex gap-1">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Ficha:</p>
                                                        <p className="text-xs font-semibold text-gray-800">{scanResult.data.ficha || 'N/A'}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Jornada:</p>
                                                        <p className="text-xs font-semibold text-gray-800">{scanResult.data.jornada || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Motivo (Descripción) */}
                                            <div className="bg-gray-50 p-2.5 rounded-lg md:col-span-2">
                                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Motivo</p>
                                                <p className="text-xs text-gray-800">{getDescripcionCompleta(scanResult.data)}</p>
                                            </div>

                                            {/* Soporte y Horarios */}
                                            {scanResult.data.soporte ? (
                                                <div className="md:col-span-2 grid grid-cols-10 gap-2">
                                                    <div className="bg-gray-50 p-2.5 rounded-lg flex flex-col  col-span-4">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Soporte</p>
                                                        <button
                                                            onClick={() => openImageModal(`${API_URL}/${scanResult.data.soporte}`)}
                                                            className="text-blue-600 hover:text-blue-800 underline text-xs flex  gap-2 bg-transparent border-0 cursor-pointer"
                                                        >
                                                            <i className="fas fa-paperclip"></i>
                                                            Ver Soporte
                                                        </button>
                                                    </div>
                                                    <div className="bg-gray-50 p-2 rounded-lg flex flex-col  col-span-6">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2 w-full text-left">Horarios</p>
                                                        <div className="flex flex-col gap-1 w-full max-w-[150px]">
                                                            <div className="flex justify-between">
                                                                <span className="text-[10px] font-bold text-red-500">SALIDA:</span>
                                                                <span className="font-mono text-[12px] text-gray-900">{scanResult.data.hora_salida}</span>
                                                            </div>
                                                            {scanResult.data.hora_regreso !== 'No aplica' && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-[10px] font-bold text-green-500">REGRESO:</span>
                                                                    <span className="font-mono text-[12px] text-gray-900">{scanResult.data.hora_regreso}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 flex flex-col">
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 w-full text-left">Horarios</p>
                                                    <div className="flex gap-4  w-full">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-red-500 block mb-1 ">SALIDA</span>
                                                            <span className="font-mono text-[12px] text-gray-900">{scanResult.data.hora_salida}</span>
                                                        </div>
                                                        {scanResult.data.hora_regreso !== 'No aplica' && (
                                                            <div>
                                                                <span className="text-[10px] font-bold text-green-500 block mb-1 ">REGRESO</span>
                                                                <span className="font-mono text-[12px] text-gray-900">{scanResult.data.hora_regreso}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3 px-2">
                                            <button
                                                onClick={handleRegistrarAcceso}
                                                className="flex-1 bg-[#39A900] text-white py-2 max-[400px]:py-2 rounded-xl font-bold text-xs max-[400px]:text-xs hover:bg-[#2A7D00] transition shadow-lg flex items-center justify-center gap-1"
                                            >
                                                Confirmar {scanResult.accion_requerida}
                                            </button>
                                            <button
                                                onClick={closeScanner}
                                                className="px-4 bg-gray-200 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-300 transition"
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
        </DashboardLayout>
    );
};

export default InicioVigilante;