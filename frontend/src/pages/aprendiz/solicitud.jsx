import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useUser } from '../../contexts/UserContext';
import { API_BASE_URL } from '../../config/api.js';

// Asegúrate de que API_BASE_URL esté bien configurado en '../../config/api.js'
const API = API_BASE_URL;

const SolicitudPermiso = () => {
    const { user } = useUser();
    const navigate = useNavigate();

    // Estados del formulario
    const [formData, setFormData] = useState({
        nombre_aprendiz: '',
        documento_aprendiz: '',
        nombre_programa: '',
        numero_ficha: '',
        nivel_formacion: '',
        jornada_formacion: '',
        centro_formacion: '',
        id_instructor_destino: '',
        documento_instructor: '',
        nombre_instructor: '',
        motivo: '',
        otros_motivo: '',
        fecha_salida: '',
        hora_salida: '',
        reingresa: 'no',
        hora_ingreso: ''
    });

    // Estado para el archivo de soporte
    const [soporteFile, setSoporteFile] = useState(null);
    const [soportePreview, setSoportePreview] = useState(null);

    // Estados para autocompletado de instructor
    const [instructores, setInstructores] = useState([]);
    const [instructorQuery, setInstructorQuery] = useState('');
    const [showInstructorResults, setShowInstructorResults] = useState(false);
    const [filteredInstructores, setFilteredInstructores] = useState([]);

    // Estados para modales
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [fieldToFocus, setFieldToFocus] = useState(null);

    // Estados para validación
    const [horaError, setHoraError] = useState('');

    // Refs
    const instructorInputRef = useRef(null);
    const instructorResultsRef = useRef(null);

    // Cargar datos iniciales
    useEffect(() => {
        cargarDatosIniciales();
        cargarInstructores();
    }, []);

    // Función para normalizar texto (sin acentos)
    const normalizeString = (str) => {
        if (!str) return '';
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
    };

    // Cargar datos del aprendiz y su programa
    const cargarDatosIniciales = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/aprendiz/perfil`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'ok') {
                const perfil = data.perfil;
                // Fecha actual de Bogotá (Formato YYYY-MM-DD)
                const fechaActual = new Date().toISOString().split('T')[0];

                setFormData(prev => ({
                    ...prev,
                    nombre_aprendiz: `${perfil.nombre} ${perfil.apellido}`,
                    documento_aprendiz: perfil.documento,
                    nombre_programa: perfil.programa?.nombre_programa || '',
                    numero_ficha: perfil.programa?.numero_ficha || '',
                    nivel_formacion: perfil.programa?.nivel || '',
                    jornada_formacion: perfil.programa?.nombre_jornada || '',
                    centro_formacion: perfil.programa?.centro_formacion || '',
                    fecha_salida: fechaActual
                }));
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    };

    // Cargar lista de instructores
    const cargarInstructores = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/aprendiz/instructores`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'ok') {
                setInstructores(data.instructores);
            }
        } catch (error) {
            console.error('Error cargando instructores:', error);
        }
    };

    // Manejar cambio en input de instructor
    const handleInstructorInput = (e) => {
        const query = e.target.value;
        setInstructorQuery(query);

        // Limpiar datos del instructor si está escribiendo
        setFormData(prev => ({
            ...prev,
            id_instructor_destino: '',
            documento_instructor: '',
            nombre_instructor: ''
        }));

        if (query.length === 0) {
            setShowInstructorResults(false);
            return;
        }

        // Filtrar instructores
        const queryNorm = normalizeString(query);
        const filtered = instructores.filter(inst => {
            const nombreCompleto = normalizeString(`${inst.nombre} ${inst.apellido}`);
            return inst.documento.includes(query) || nombreCompleto.includes(queryNorm);
        });

        setFilteredInstructores(filtered.slice(0, 10)); // Limitar a 10 resultados
        setShowInstructorResults(true);
    };

    // Seleccionar instructor
    const selectInstructor = (instructor) => {
        setFormData(prev => ({
            ...prev,
            id_instructor_destino: instructor.id_usuario,
            documento_instructor: instructor.documento,
            nombre_instructor: `${instructor.nombre} ${instructor.apellido}`
        }));
        setInstructorQuery(`${instructor.nombre} ${instructor.apellido}`);
        setShowInstructorResults(false);
    };

    // Manejar cambios en el formulario
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Limpiar error de hora si cambian los valores
        if (name === 'hora_salida' || name === 'hora_ingreso') {
            setHoraError('');
        }
    };

    // Manejar cambio de motivo
    const handleMotivoChange = (e) => {
        const value = e.target.value;
        setFormData(prev => ({
            ...prev,
            motivo: value,
            otros_motivo: value === 'otros' ? prev.otros_motivo : '' // Limpiar otros_motivo si no es 'otros'
        }));
    };

    // Mostrar modal de error
    const showError = (message, field = null) => {
        setErrorMessage(message);
        setFieldToFocus(field);
        setShowErrorModal(true);
    };

    // Cerrar modal de error
    const closeErrorModal = () => {
        setShowErrorModal(false);
        if (fieldToFocus) {
            fieldToFocus.focus();
            fieldToFocus.select();
        }
        setFieldToFocus(null);
    };

    // Helper para obtener texto del motivo
    const getMotivoTexto = (motivoKey) => {
        const motivos = {
            'cita_medica': 'Cita o incapacidad médica',
            'electoral': 'Citaciones a diligencias electorales y/o gubernamentales',
            'laboral': 'Requerimientos o compromisos laborales',
            'fuerza_mayor': 'Casos fortuitos o de fuerza mayor',
            'etapa_productiva': 'Trámites de etapa productiva',
            'representacion_sena': 'Autorización para asistir en representación del SENA',
            'diligencia_judicial': 'Citación a diligencias judiciales'
        };
        return motivos[motivoKey] || motivoKey;
    };

    // Manejar cambio de archivo
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tipo de archivo
            if (!file.type.startsWith('image/')) {
                showError('Por favor, seleccione un archivo de imagen válido.');
                return;
            }

            setSoporteFile(file);

            // Crear preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setSoportePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setSoporteFile(null);
            setSoportePreview(null);
        }
    };

    // Eliminar archivo seleccionado
    const removeFile = () => {
        setSoporteFile(null);
        setSoportePreview(null);
        const fileInput = document.getElementById('soporte-input');
        if (fileInput) fileInput.value = '';
    };

    // Validar y enviar formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        setHoraError('');

        // 1. Validar instructor seleccionado
        if (!formData.id_instructor_destino) {
            showError('Por favor, seleccione un Instructor de la lista de sugerencias.', instructorInputRef.current);
            return;
        }

        // 2. Validar motivo
        if (!formData.motivo) {
            showError('Por favor, seleccione un motivo de salida.');
            return;
        }

        // 3. Validar "Otros" motivo
        if (formData.motivo === 'otros' && !formData.otros_motivo.trim()) {
            showError('Por favor, especifique el motivo en el campo "Otros".');
            return;
        }

        // 4. Validar hora de reingreso (si aplica)
        if (formData.reingresa === 'si') {
            if (!formData.hora_ingreso) {
                showError('Por favor, ingrese la hora de reingreso.');
                return;
            }
            if (formData.hora_ingreso <= formData.hora_salida) {
                setHoraError('La hora de ingreso debe ser posterior a la hora de salida. Vuelve a intentarlo.');
                return;
            }
        }

        // Mostrar modal de carga
        setShowLoadingModal(true);

        try {
            const token = localStorage.getItem('token');

            // Usar FormData para enviar archivo + datos
            const formDataToSend = new FormData();
            formDataToSend.append('id_instructor_destino', formData.id_instructor_destino);
            formDataToSend.append('motivo', formData.motivo === 'otros' ? formData.otros_motivo : formData.motivo);
            if (formData.motivo === 'otros') {
                formDataToSend.append('descripcion', formData.otros_motivo);
            }
            formDataToSend.append('hora_salida', formData.hora_salida);
            formDataToSend.append('reingresa', formData.reingresa);
            if (formData.reingresa === 'si') {
                formDataToSend.append('hora_ingreso', formData.hora_ingreso);
            }

            // Agregar archivo si existe
            if (soporteFile) {
                formDataToSend.append('soporte', soporteFile);
            }

            const response = await fetch(`${API}/api/aprendiz/solicitud`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // No Content-Type header needed for FormData
                },
                body: formDataToSend
            });
            const data = await response.json();

            // Usamos un timeout para dar un efecto de "carga"
            setTimeout(() => {
                setShowLoadingModal(false);

                if (data.status === 'ok') {
                    // Preparar datos para mostrar en la página de espera
                    const solicitudDataParaEspera = {
                        nombre_aprendiz: formData.nombre_aprendiz,
                        documento_aprendiz: formData.documento_aprendiz,
                        nombre_programa: formData.nombre_programa,
                        numero_ficha: formData.numero_ficha,
                        nivel_formacion: formData.nivel_formacion,
                        jornada_formacion: formData.jornada_formacion,
                        centro_formacion: formData.centro_formacion,
                        fecha_salida: formData.fecha_salida,
                        hora_salida: formData.hora_salida,
                        reingresa: formData.reingresa,
                        hora_ingreso: formData.hora_ingreso,
                        nombre_instructor: formData.nombre_instructor,
                        motivo_mostrar: formData.motivo === 'otros' ? `Otros: ${formData.otros_motivo}` : getMotivoTexto(formData.motivo)
                    };

                    // Redirigir a página de espera con los datos y el ID del permiso
                    navigate('/Aprendiz/Espera', {
                        state: {
                            solicitudData: solicitudDataParaEspera,
                            id_permiso: data.id_permiso
                        }
                    });
                } else {
                    showError(data.message || 'Error al crear la solicitud');
                }
            }, 2000);

        } catch (error) {
            console.error('Error al enviar solicitud:', error);
            setTimeout(() => {
                setShowLoadingModal(false);
                showError('Error de conexión. Por favor, intente nuevamente.');
            }, 2000);
        }
    };

    // Cerrar resultados al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                instructorResultsRef.current && !instructorResultsRef.current.contains(event.target) &&
                instructorInputRef.current && !instructorInputRef.current.contains(event.target)
            ) {
                setShowInstructorResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <DashboardLayout title="Solicitud de Permiso de Salida">
            <div className="min-h-screen bg-[#f4f4f4] p-5">
                <div className="max-w-[800px] mx-auto my-5 bg-white p-6 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                    <h2 className="text-center text-[#39A900] mb-6 text-2xl font-bold">
                        Solicitud de Permiso de Salida
                    </h2>
                    <form onSubmit={handleSubmit}>
                        {/* Datos del Aprendiz */}
                        <fieldset className="border border-[#ccc] p-5 mb-6 rounded-md">
                            <legend className="text-lg font-bold text-[#39A900] px-2.5">Datos del Aprendiz</legend>
                            <div className="flex flex-wrap gap-5 mb-4">
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Nombre del Aprendiz:
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nombre_aprendiz}
                                        readOnly
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Número de Documento:
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.documento_aprendiz}
                                        readOnly
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* Datos de la Formación */}
                        <fieldset className="border border-[#ccc] p-5 mb-6 rounded-md">
                            <legend className="text-lg font-bold text-[#39A900] px-2.5">Datos de la Formación</legend>
                            <div className="mb-4">
                                <label className="block mb-1 font-bold text-[#333] text-sm">
                                    Programa de Formación:
                                </label>
                                <input
                                    type="text"
                                    value={formData.nombre_programa}
                                    readOnly
                                    className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                />
                            </div>
                            <div className="flex flex-wrap gap-5 mb-4">
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Número de Ficha:
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.numero_ficha}
                                        readOnly
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Nivel de Formación:
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nivel_formacion}
                                        readOnly
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-5 mb-4">
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Jornada:
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.jornada_formacion}
                                        readOnly
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Centro de Formación:
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.centro_formacion}
                                        readOnly
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* Datos del Instructor */}
                        <fieldset className="border border-[#ccc] p-5 mb-6 rounded-md">
                            <legend className="text-lg font-bold text-[#39A900] px-2.5">Datos del Instructor</legend>
                            <div className="mb-4 relative">
                                <label className="block mb-1 font-bold text-[#333] text-sm">
                                    Buscar Instructor:
                                </label>
                                <div className="relative">
                                    <input
                                        ref={instructorInputRef}
                                        type="text"
                                        value={instructorQuery}
                                        onChange={handleInstructorInput}
                                        placeholder="Documento o Nombre del Instructor"
                                        className="w-full p-2.5 border border-[#ddd] rounded"
                                        required
                                    />
                                    {showInstructorResults && (
                                        <ul
                                            ref={instructorResultsRef}
                                            className="absolute z-10 w-full max-h-[200px] overflow-y-auto border border-[#ddd] border-t-0 bg-white shadow-[0_4px_6px_rgba(0,0,0,0.1)] rounded-b list-none p-0 m-0"
                                        >
                                            {filteredInstructores.length === 0 ? (
                                                <li className="p-2.5 border-b border-[#eee] cursor-default">
                                                    No se encontraron instructores.
                                                </li>
                                            ) : (
                                                filteredInstructores.map(inst => (
                                                    <li
                                                        key={inst.id_usuario}
                                                        onClick={() => selectInstructor(inst)}
                                                        className="p-2.5 border-b border-[#eee] cursor-pointer hover:bg-[#e8f5e1] flex flex-col transition-colors"
                                                    >
                                                        <strong className="font-bold text-[#333]">
                                                            {inst.nombre} {inst.apellido}
                                                        </strong>
                                                        <small className="text-xs text-[#666]">
                                                            {inst.documento}
                                                        </small>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-5 mb-4">
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Número de Documento:
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.documento_instructor}
                                        readOnly
                                        placeholder="Documento del Instructor"
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Nombre del Instructor:
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nombre_instructor}
                                        readOnly
                                        placeholder="Nombre del Instructor"
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* Motivo de Salida */}
                        <fieldset className="border border-[#ccc] p-5 mb-6 rounded-md">
                            <legend className="text-lg font-bold text-[#39A900] px-2.5">
                                Motivo de Salida (Seleccione solo uno)
                            </legend>
                            <div className="flex flex-wrap gap-5 mb-4">
                                <div className="flex-1 min-w-[250px]">
                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center font-normal cursor-pointer">
                                            <input
                                                type="radio"
                                                name="motivo"
                                                value="cita_medica"
                                                checked={formData.motivo === 'cita_medica'}
                                                onChange={handleMotivoChange}
                                                className="mr-2"
                                                required
                                            />
                                            Cita o incapacidad médica
                                        </label>
                                        <label className="flex items-center font-normal cursor-pointer">
                                            <input
                                                type="radio"
                                                name="motivo"
                                                value="electoral"
                                                checked={formData.motivo === 'electoral'}
                                                onChange={handleMotivoChange}
                                                className="mr-2"
                                            />
                                            Citaciones a diligencias electorales y/o gubernamentales
                                        </label>
                                        <label className="flex items-center font-normal cursor-pointer">
                                            <input
                                                type="radio"
                                                name="motivo"
                                                value="laboral"
                                                checked={formData.motivo === 'laboral'}
                                                onChange={handleMotivoChange}
                                                className="mr-2"
                                            />
                                            Requerimientos o compromisos laborales
                                        </label>
                                        <label className="flex items-center font-normal cursor-pointer">
                                            <input
                                                type="radio"
                                                name="motivo"
                                                value="fuerza_mayor"
                                                checked={formData.motivo === 'fuerza_mayor'}
                                                onChange={handleMotivoChange}
                                                className="mr-2"
                                            />
                                            Casos fortuitos o de fuerza mayor
                                        </label>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-[250px]">
                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center font-normal cursor-pointer">
                                            <input
                                                type="radio"
                                                name="motivo"
                                                value="etapa_productiva"
                                                checked={formData.motivo === 'etapa_productiva'}
                                                onChange={handleMotivoChange}
                                                className="mr-2"
                                            />
                                            Trámites de etapa productiva
                                        </label>
                                        <label className="flex items-center font-normal cursor-pointer">
                                            <input
                                                type="radio"
                                                name="motivo"
                                                value="representacion_sena"
                                                checked={formData.motivo === 'representacion_sena'}
                                                onChange={handleMotivoChange}
                                                className="mr-2"
                                            />
                                            Autorización para asistir en representación del SENA
                                        </label>
                                        <label className="flex items-center font-normal cursor-pointer">
                                            <input
                                                type="radio"
                                                name="motivo"
                                                value="diligencia_judicial"
                                                checked={formData.motivo === 'diligencia_judicial'}
                                                onChange={handleMotivoChange}
                                                className="mr-2"
                                            />
                                            Citación a diligencias judiciales
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="flex items-center font-normal cursor-pointer mb-2">
                                    <input
                                        type="radio"
                                        name="motivo"
                                        value="otros"
                                        checked={formData.motivo === 'otros'}
                                        onChange={handleMotivoChange}
                                        className="mr-2"
                                    />
                                    Otros
                                </label>
                                {formData.motivo === 'otros' && (
                                    <input
                                        type="text"
                                        name="otros_motivo"
                                        value={formData.otros_motivo}
                                        onChange={handleChange}
                                        placeholder="Especifique el motivo"
                                        className="w-full p-2.5 border border-[#ddd] rounded"
                                        required
                                    />
                                )}
                            </div>
                        </fieldset>

                        {/* Soporte (Opcional) */}
                        <fieldset className="border border-[#ccc] p-5 mb-6 rounded-md">
                            <legend className="text-lg font-bold text-[#39A900] px-2.5">
                                Soporte / Evidencia (Opcional)
                            </legend>
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-3">
                                    Si tienes una evidencia que respalde tu salida (cita médica, carta, etc.), puedes cargarla aquí.
                                </p>

                                {!soportePreview ? (
                                    <div className="flex items-center justify-center w-full">
                                        <label htmlFor="soporte-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                                </svg>
                                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para cargar</span></p>
                                                <p className="text-xs text-gray-500">PNG, JPG o JPEG (MAX. 5MB)</p>
                                            </div>
                                            <input id="soporte-input" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="relative inline-block">
                                        <img src={soportePreview} alt="Vista previa soporte" className="h-32 w-auto rounded-lg border border-gray-300 object-cover" />
                                        <button
                                            type="button"
                                            onClick={removeFile}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 focus:outline-none shadow-md"
                                            title="Eliminar imagen"
                                        >
                                            &times;
                                        </button>
                                        <p className="text-xs text-center text-gray-500 mt-1">Imagen cargada</p>
                                    </div>
                                )}
                            </div>
                        </fieldset>

                        {/* Horario de Salida */}
                        <fieldset className="border border-[#ccc] p-5 mb-6 rounded-md">
                            <legend className="text-lg font-bold text-[#39A900] px-2.5">Horario de Salida</legend>
                            <div className="flex flex-wrap gap-5 mb-4">
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Fecha de Salida:
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.fecha_salida}
                                        readOnly
                                        className="w-full p-2.5 border border-[#ddd] rounded bg-[#f8f8f8] text-[#666] cursor-default"
                                    />
                                </div>
                                <div className="flex-1 min-w-[250px]">
                                    <label className="block mb-1 font-bold text-[#333] text-sm">
                                        Hora de Salida:
                                    </label>
                                    <input
                                        type="time"
                                        name="hora_salida"
                                        value={formData.hora_salida}
                                        onChange={handleChange}
                                        className="w-full p-2.5 border border-[#ddd] rounded"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-5 mb-4">
                                <div className="flex-1 min-w-[250px]">
                                    <p className="font-bold mb-1 text-sm">¿Reingresa?</p>
                                    <label className="flex items-center font-normal cursor-pointer mr-4">
                                        <input
                                            type="radio"
                                            name="reingresa"
                                            value="no"
                                            checked={formData.reingresa === 'no'}
                                            onChange={handleChange}
                                            className="mr-2"
                                        />
                                        No
                                    </label>
                                    <label className="flex items-center font-normal cursor-pointer">
                                        <input
                                            type="radio"
                                            name="reingresa"
                                            value="si"
                                            checked={formData.reingresa === 'si'}
                                            onChange={handleChange}
                                            className="mr-2"
                                        />
                                        Sí
                                    </label>
                                </div>
                                <div className="flex-1 min-w-[250px]">
                                    {formData.reingresa === 'si' && (
                                        <div>
                                            <label className="block mb-1 font-bold text-[#333] text-sm">
                                                Hora de Ingreso:
                                            </label>
                                            <input
                                                type="time"
                                                name="hora_ingreso"
                                                value={formData.hora_ingreso}
                                                onChange={handleChange}
                                                className="w-full p-2.5 border border-[#ddd] rounded"
                                                required
                                            />
                                            {horaError && (
                                                <p className="text-red-600 text-sm mt-1">{horaError}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </fieldset>

                        <button
                            type="submit"
                            className="block w-full p-4 bg-[#39A900] text-white border-none rounded font-bold text-lg cursor-pointer hover:bg-[#2A7D00] transition-colors mt-5"
                        >
                            Enviar Solicitud
                        </button>
                    </form>
                </div>
            </div>

            {/* Modal de Carga */}
            {showLoadingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[200]">
                    <div className="bg-white p-8 rounded-lg shadow-[0_5px_15px_rgba(0,0,0,0.3)] text-center max-w-[400px] w-[90%]">
                        <div className="border-4 border-gray-200 w-9 h-9 rounded-full border-l-[#39A900] animate-spin mx-auto mb-5"></div>
                        <h3 className="text-xl mb-2">Esperando solicitud de aprobamiento...</h3>
                        <p className="text-gray-600">Por favor, espere.</p>
                    </div>
                </div>
            )}

            {/* Modal de Error */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[200]">
                    <div className="bg-white p-8 rounded-lg shadow-[0_5px_15px_rgba(0,0,0,0.3)] text-center max-w-[350px] w-[90%]">
                        <span className="text-5xl text-[#f0ad4e] block mb-4">&#9888;</span>
                        <h3 className="text-xl mb-4 text-[#333]">Error de Validación</h3>
                        <p className="text-[#333] mb-6 text-base">{errorMessage}</p>
                        <button
                            onClick={closeErrorModal}
                            className="bg-[#39A900] text-white border-none py-3 px-5 rounded cursor-pointer font-bold w-full hover:bg-[#2A7D00] transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default SolicitudPermiso;