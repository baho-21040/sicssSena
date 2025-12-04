import React, { useState, useEffect, useRef } from 'react';
import '../../../styles/registrar.css';
import '../../../base.css';
import DashboardLayout from '../../../components/DashboardLayout.jsx';
import { useUser } from '../../../contexts/UserContext.jsx';
import { useNavigate, useParams } from 'react-router-dom';

import { API_BASE_URL } from '../../../config/api.js';

const API = API_BASE_URL;

export default function EditarUsuario() {
    const { user } = useUser();
    const navigate = useNavigate();
    const { id } = useParams();
    const topRef = useRef(null);

    // Estados del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        tipo_documento: '',
        documento: '',
        correo: '',
        clave: '',
        id_rol: '',
        estado: 'Activo',
        id_programa: ''
    });

    const [roles, setRoles] = useState([]);
    const [programas, setProgramas] = useState([]);
    const [filteredProgramas, setFilteredProgramas] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [selectedPrograma, setSelectedPrograma] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [showInactiveModal, setShowInactiveModal] = useState(false);
    const [programaInactivo, setProgramaInactivo] = useState(null);

    // Cargar roles, programas y datos del usuario al montar
    useEffect(() => {
        const loadData = async () => {
            await fetchRoles();
            await fetchProgramas();
            await fetchUserData();
        };
        loadData();
    }, [id]);

    // Efecto para hacer scroll cuando hay un error
    useEffect(() => {
        if (errorMessage && topRef.current) {
            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [errorMessage]);

    const fetchRoles = async () => {
        try {
            const response = await fetch(`${API}/api/roles`);
            const data = await response.json();
            if (data.status === 'ok') {
                setRoles(data.roles);
            }
        } catch (error) {
            console.error('Error cargando roles:', error);
        }
    };

    const fetchProgramas = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/coordinacion/programas`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.status === 'ok') {
                // Filtrar solo programas activos para el buscador
                const programasActivos = data.programas.filter(p => p.estado === 'Activo');
                setProgramas(programasActivos);
            }
        } catch (error) {
            console.error('Error cargando programas:', error);
        }
    };

    const fetchUserData = async () => {
        setLoadingData(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/coordinacion/usuarios/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.status === 'ok') {
                const u = data.usuario;
                setFormData({
                    nombre: u.nombre,
                    apellido: u.apellido,
                    tipo_documento: u.tipo_documento,
                    documento: u.documento,
                    correo: u.correo,
                    clave: '', // No mostramos la clave
                    id_rol: u.id_rol.toString(),
                    estado: u.estado,
                    id_programa: u.id_programa || ''
                });

                // Si tiene programa, pre-llenar
                if (u.id_programa) {
                    const programaData = {
                        id_programa: u.id_programa,
                        nombre_programa: u.nombre_programa,
                        numero_ficha: u.numero_ficha,
                        nivel: u.nivel,
                        centro_formacion: u.centro_formacion,
                        nombre_jornada: u.nombre_jornada,
                        estado: u.estado_programa || 'Activo'
                    };
                    setSelectedPrograma(programaData);
                    setSearchQuery(u.nombre_programa);

                    // Si el programa está inactivo, mostrar modal
                    if (programaData.estado === 'Inactivo') {
                        setProgramaInactivo(programaData);
                        setShowInactiveModal(true);
                    }
                }
            } else {
                setErrorMessage('No se pudo cargar la información del usuario.');
            }
        } catch (error) {
            console.error("Error fetching user", error);
            setErrorMessage('Error de conexión al cargar usuario.');
        } finally {
            setLoadingData(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Validaciones según el campo
        switch (name) {
            case "nombre":
            case "apellido":
                if (!/^[A-Za-zÁ-Úá-úñÑ\s]*$/.test(value)) return;
                break;

            case "documento":
                if (!/^[0-9]*$/.test(value)) return;
                break;

            case "correo":
                if (!/^[A-Za-z0-9@._-]*$/.test(value)) return;
                break;

            case "clave":
                const permitido = /^[A-Za-zÁ-Úá-úñÑ0-9@#$%&*\-_+]+$/;
                if (value !== "" && !permitido.test(value)) return;
                break;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchChange = (e) => {
        const query = e.target.value;

        const soloLetras = /^[A-Za-zÁ-Úá-úñÑ\s]+$/;
        const soloNumeros = /^[0-9]+$/;

        if (
            query !== "" &&
            !soloLetras.test(query) &&
            !soloNumeros.test(query)
        ) {
            return;
        }

        setSearchQuery(query);

        if (selectedPrograma) {
            setSelectedPrograma(null);
            setFormData(prev => ({ ...prev, id_programa: '' }));
        }

        const queryLower = query.toLowerCase();

        if (queryLower.length < 2) {
            setShowResults(false);
            setFilteredProgramas([]);
            return;
        }

        const filtered = programas.filter(p =>
            p.nombre_programa.toLowerCase().includes(queryLower) ||
            p.numero_ficha.toString().includes(queryLower)
        );

        setFilteredProgramas(filtered.slice(0, 10));
        setShowResults(true);
    };

    const handleProgramaSelect = (programa) => {
        setSelectedPrograma(programa);
        setFormData(prev => ({ ...prev, id_programa: programa.id_programa }));
        setSearchQuery(programa.nombre_programa);
        setShowResults(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        // Validación para Aprendiz
        if (formData.id_rol === '2' && !formData.id_programa) {
            setErrorMessage('Debe seleccionar un programa de formación de la lista para el Aprendiz');
            return;
        }

        try {
            const response = await fetch(`${API}/api/coordinacion/usuarios/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.status === 'ok') {
                setSuccessMessage('Usuario actualizado exitosamente');
                setTimeout(() => {
                    navigate('/coordinacion/busquedadeusuario');
                }, 2000);
            } else {
                setErrorMessage(data.message || 'Error al actualizar usuario');
            }
        } catch (error) {
            setErrorMessage('Error de red. Intente de nuevo más tarde.');
        }
    };

    const isAprendiz = formData.id_rol === '2';

    if (loadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-green-600"></i>
                    <p className="mt-4 text-gray-600">Cargando datos del usuario...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout title="Control de Salida | Editar Usuario">
            <div className="admin-container">
                <div className="main-content-admin">
                    <div className="register-container">
                        <div className="register-card" ref={topRef}>

                            <button onClick={() => navigate('/coordinacion/busquedadeusuario')} className="btn-back">
                                <i className="fas fa-chevron-left"></i> Volver a Búsqueda
                            </button>

                            {errorMessage && (
                                <div className="alert alert-error">
                                    <i className="fas fa-exclamation-circle"></i> {errorMessage}
                                </div>
                            )}

                            {successMessage && (
                                <div className="alert alert-success">
                                    <i className="fas fa-check-circle"></i> {successMessage}
                                </div>
                            )}

                            <div className="card-header-register">
                                <i className="fas fa-user-edit icon-title"></i>
                                <h2>Editar Usuario</h2>
                                <p className="subtitle-register">Modifique los datos del usuario. El rol no puede ser cambiado.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="form-professional">

                                <div className="form-section-title">
                                    <i className="fas fa-id-card"></i> Datos de Identificación y Contacto
                                </div>

                                <div className="form-group-wrapper">

                                    <div className="grupo-form">
                                        <label htmlFor="nombre">Nombre:</label>
                                        <input
                                            type="text"
                                            id="nombre"
                                            name="nombre"
                                            placeholder="Ej: Juan"
                                            value={formData.nombre}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="apellido">Apellido:</label>
                                        <input
                                            type="text"
                                            id="apellido"
                                            name="apellido"
                                            placeholder="Ej: Pérez"
                                            value={formData.apellido}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="tipo_documento">Tipo de Documento:</label>
                                        <select
                                            id="tipo_documento"
                                            name="tipo_documento"
                                            value={formData.tipo_documento}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="" disabled>-- Seleccione --</option>
                                            <option value="CC">Cédula de Ciudadanía</option>
                                            <option value="TI">Tarjeta de Identidad</option>
                                            <option value="CE">Cédula de Extranjería</option>
                                        </select>
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="documento">Número de Documento:</label>
                                        <input
                                            type="text"
                                            id="documento"
                                            name="documento"
                                            placeholder="Ej: 1234567890"
                                            value={formData.documento}
                                            onChange={handleInputChange}
                                            required
                                            disabled
                                        />
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="correo">Correo Electrónico:</label>
                                        <input
                                            type="email"
                                            id="correo"
                                            name="correo"
                                            placeholder="Ej: usuario@sena.edu.co"
                                            value={formData.correo}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="clave">Nueva Contraseña (opcional):</label>
                                        <input
                                            type="password"
                                            id="clave"
                                            name="clave"
                                            placeholder="Dejar vacío para mantener la actual"
                                            value={formData.clave}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                </div>

                                <div className="form-section-title">
                                    <i className="fas fa-user-tag"></i> Rol y Estado
                                </div>

                                <div className="form-group-wrapper">

                                    <div className="grupo-form">
                                        <label htmlFor="id_rol">Rol:</label>
                                        <select
                                            id="id_rol"
                                            name="id_rol"
                                            value={formData.id_rol}
                                            onChange={handleInputChange}
                                            required
                                            disabled
                                        >
                                            <option value="" disabled>-- Seleccione un rol --</option>
                                            {roles.map(rol => (
                                                <option key={rol.id_rol} value={rol.id_rol}>
                                                    {rol.nombre_rol}
                                                </option>
                                            ))}
                                        </select>
                                        <small className="form-hint">El rol no puede ser modificado</small>
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="estado">Estado:</label>
                                        <select
                                            id="estado"
                                            name="estado"
                                            value={formData.estado}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="Activo">Activo</option>
                                            <option value="Inactivo">Inactivo</option>
                                        </select>
                                    </div>

                                </div>

                                {isAprendiz && (
                                    <div className="campos-aprendiz-section">
                                        <div className="form-section-title mt-20">
                                            <i className="fas fa-graduation-cap"></i> Programa de Formación (Solo Aprendices)
                                        </div>

                                        <p className="note">Busca el programa de formación o número de ficha del Aprendiz. La información se cargará automáticamente al seleccionarlo.</p>

                                        <div className="form-group-wrapper">

                                            <div className="grupo-form autocomplete-container full-width">
                                                <label htmlFor="programa_autocomplete">Buscar Programa de Formación o Ficha:</label>
                                                <input
                                                    type="text"
                                                    id="programa_autocomplete"
                                                    placeholder="Escriba nombre de programa o número de ficha..."
                                                    value={searchQuery}
                                                    onChange={handleSearchChange}
                                                    autoComplete="off"
                                                />
                                                {showResults && (
                                                    <ul className="autocomplete-list">
                                                        {filteredProgramas.length > 0 ? (
                                                            filteredProgramas.map(programa => (
                                                                <li
                                                                    key={programa.id_programa}
                                                                    className="autocomplete-item"
                                                                    onClick={() => handleProgramaSelect(programa)}
                                                                >
                                                                    <strong>{programa.nombre_programa}</strong>
                                                                    <small>Ficha: {programa.numero_ficha} | Centro: {programa.centro_formacion}</small>
                                                                </li>
                                                            ))
                                                        ) : (
                                                            <li className="autocomplete-no-results">No se encontraron programas activos.</li>
                                                        )}
                                                    </ul>
                                                )}
                                            </div>

                                            {selectedPrograma && (
                                                <>
                                                    <div className="grupo-form">
                                                        <label htmlFor="programa_ficha">Número de Ficha:</label>
                                                        <input
                                                            type="text"
                                                            id="programa_ficha"
                                                            value={selectedPrograma.numero_ficha}
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div className="grupo-form">
                                                        <label htmlFor="programa_nivel">Nivel de Formación:</label>
                                                        <input
                                                            type="text"
                                                            id="programa_nivel"
                                                            value={selectedPrograma.nivel}
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div className="grupo-form">
                                                        <label htmlFor="programa_centro">Centro de Formación:</label>
                                                        <input
                                                            type="text"
                                                            id="programa_centro"
                                                            value={selectedPrograma.centro_formacion}
                                                            readOnly
                                                        />
                                                    </div>

                                                    <div className="grupo-form">
                                                        <label htmlFor="programa_jornada">Jornada:</label>
                                                        <input
                                                            type="text"
                                                            id="programa_jornada"
                                                            value={selectedPrograma.nombre_jornada}
                                                            readOnly
                                                        />
                                                    </div>
                                                </>
                                            )}

                                        </div>
                                    </div>
                                )}

                                <div className="form-actions">
                                    <button type="submit" className="btn-submit-register">
                                        <i className="fas fa-save"></i> Actualizar Usuario
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Programa Inactivo */}
            {showInactiveModal && programaInactivo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
                        <i className="fas fa-exclamation-triangle text-5xl text-yellow-500 mb-4"></i>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Programa de Formación Inactivo</h3>
                        <p className="text-gray-600 mb-4">
                            Este usuario está asignado a un programa de formación que actualmente se encuentra <strong className="text-red-600">INACTIVO</strong>:
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                            <p className="text-sm"><strong>Programa:</strong> {programaInactivo.nombre_programa}</p>
                            <p className="text-sm"><strong>Ficha:</strong> {programaInactivo.numero_ficha}</p>
                            <p className="text-sm"><strong>Estado:</strong> <span className="text-red-600 font-bold">Inactivo</span></p>
                        </div>
                        <button
                            onClick={() => setShowInactiveModal(false)}
                            className="px-6 py-2 bg-[#39A900] text-white rounded-lg hover:bg-[#2A7D00] transition font-semibold"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
