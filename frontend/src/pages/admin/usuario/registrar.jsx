import React, { useState, useEffect, useRef } from 'react';
import '../../../base.css';
import DashboardLayout from '../../../components/DashboardLayout.jsx';
import { useUser } from '../../../contexts/UserContext.jsx';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../../../config/api.js';

const API = API_BASE_URL;

export default function RegistrarUsuario() {
    const { user } = useUser();
    const navigate = useNavigate();
    const topRef = useRef(null); // Ref para hacer scroll al mensaje

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

    // Cargar roles y programas al montar
    useEffect(() => {
        fetchRoles();
        fetchProgramas();
    }, []);

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
            const response = await fetch(`${API}/api/programas`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.status === 'ok') {
                // Filtrar solo programas activos
                const programasActivos = data.programas.filter(p => p.estado === 'Activo');
                setProgramas(programasActivos);
            }
        } catch (error) {
            console.error('Error cargando programas:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // --- Validaciones según el campo ---
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

        // ✔ Guardar valor SOLO si pasó las validaciones
        setFormData(prev => ({ ...prev, [name]: value }));
    };


    const handleSearchChange = (e) => {
        const query = e.target.value;

        // --- VALIDACIÓN: solo letras O solo números (no mezcla y nada más) ---
        const soloLetras = /^[A-Za-zÁ-Úá-úñÑ\s]+$/;
        const soloNumeros = /^[0-9]+$/;

        if (
            query !== "" &&
            !soloLetras.test(query) &&
            !soloNumeros.test(query)
        ) {
            return; // ❌ Bloquea cualquier símbolo o mezcla
        }



        setSearchQuery(query);

        // Si hay un programa seleccionado y el usuario escribe algo nuevo, reiniciar selección
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
            const response = await fetch(`${API}/api/usuarios/crear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.status === 'ok') {
                setSuccessMessage('Usuario registrado exitosamente');
                // Redirigir a buscar usuarios después de 2 segundos
                setTimeout(() => {
                    navigate('/BuscarUsuario');
                }, 2000);
            } else {
                setErrorMessage(data.message || 'Error al registrar usuario');
            }
        } catch (error) {
            setErrorMessage('Error de red. Intente de nuevo más tarde.');
        }
    };

    const isAprendiz = formData.id_rol === '2';

    return (
        <DashboardLayout title="Control de Salida | Registro de Usuario">
            <div className="admin-container">
                <div className="main-content-admin p-4">
                    <div className="register-container">
                        <div className="register-card" ref={topRef}>

                            <button onClick={() => navigate('/InicioAdmin')} className="btn-back">
                                <i className="fas fa-chevron-left"></i> Volver al Inicio
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
                                <i className="fas fa-user-plus icon-title "></i>
                                <h2 className=''>Registro de Nuevo Usuario</h2>
                                <p className="subtitle-register">Completa todos los campos para crear una cuenta de usuario.</p>
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
                                            <option value="" disabled>Seleccione el tipo</option>
                                            <option value="CC">Cédula de Ciudadanía (CC)</option>
                                            <option value="TI">Tarjeta de Identidad (TI)</option>
                                            <option value="CE">Cédula de Extranjería (CE)</option>
                                            <option value="Pasaporte">Pasaporte</option>
                                        </select>
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="documento">Número de Documento:</label>
                                        <input
                                            type="text"
                                            id="documento"
                                            name="documento"
                                            placeholder="Ej: 1000000000"
                                            value={formData.documento}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="correo">Correo Electrónico:</label>
                                        <input
                                            type="email"
                                            id="correo"
                                            name="correo"
                                            placeholder="Ej: juan.perez@sena.edu.co"
                                            value={formData.correo}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="id_rol">Rol de Usuario:</label>
                                        <select
                                            id="id_rol"
                                            name="id_rol"
                                            value={formData.id_rol}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="" disabled>Seleccione el rol</option>
                                            {roles.map(rol => (
                                                <option key={rol.id_rol} value={rol.id_rol}>
                                                    {rol.nombre_rol}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                </div>

                                <div className="form-section-title mt-20">
                                    <i className="fas fa-lock"></i> Credenciales y Estado
                                </div>

                                <div className="form-group-wrapper">

                                    <div className="grupo-form">
                                        <label htmlFor="clave">Contraseña:</label>
                                        <input
                                            type="password"
                                            id="clave"
                                            name="clave"
                                            placeholder="••••••••"
                                            value={formData.clave}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="grupo-form">
                                        <label htmlFor="estado">Estado del Usuario:</label>
                                        <select
                                            id="estado"
                                            name="estado"
                                            value={formData.estado}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="Activo">Activo</option>
                                            <option value="Inactivo">Inactivo</option>
                                            <option value="Bloqueado">Bloqueado</option>
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
                                                            <li className="autocomplete-no-results">No se encontraron programas.</li>
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
                                        <i className="fas fa-user-plus"></i> Registrar Usuario
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
