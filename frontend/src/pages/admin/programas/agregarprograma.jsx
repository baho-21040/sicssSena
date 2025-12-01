import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/DashboardLayout';

import { API_BASE_URL } from '../../../config/api.js';

export default function AgregarPrograma() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [jornadas, setJornadas] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        nombre_programa: '',
        nivel: '',
        centro_formacion: '',
        numero_ficha: '',
        id_jornada: ''
    });

    const API_URL = API_BASE_URL;

    // Cargar jornadas al montar el componente
    useEffect(() => {
        fetchJornadas();
    }, []);

    const fetchJornadas = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/jornadas`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar jornadas');
            }

            const data = await response.json();
            if (data.status === 'ok') {
                setJornadas(data.jornadas || []);
            }
        } catch (err) {
            console.error('Error al cargar jornadas:', err);
            setErrorMessage('No se pudieron cargar las jornadas');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        let filteredValue = value;

        // Solo letras y espacios para nombre_programa
        if (name === "nombre_programa") {
            filteredValue = value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, "");
        }

        // Solo letras y espacios para centro_formacion
        if (name === "centro_formacion") {
            filteredValue = value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, "");
        }

        // Solo números para numero_ficha
        if (name === "numero_ficha") {
            filteredValue = value.replace(/\D/g, ""); // elimina todo excepto números
        }

        setFormData(prev => ({
            ...prev,
            [name]: filteredValue
        }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/programas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.status === 'ok') {
                setSuccessMessage('Programa registrado exitosamente');
                setTimeout(() => {
                    navigate('/programas?status=success_reg');
                }, 1500);
            } else {
                setErrorMessage(data.message || 'Error al registrar el programa');
            }
        } catch (err) {
            setErrorMessage('Error de red. Intente de nuevo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout headerTitle="Control de Salida | Registro de Programas">
            <main className="flex justify-center items-start pt-10 pb-10 min-h-screen bg-[#f7f9fb]">
                <div className="w-full max-w-[850px] px-4">
                    <div className="bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-8 md:p-11 relative">

                        {/* Botón Volver */}
                        <button
                            onClick={() => navigate('/programas')}
                            className="text-[#666] text-sm mb-5 inline-block transition-colors duration-300 hover:text-[#005600] hover:underline"
                        >
                            <i className="fas fa-chevron-left mr-2"></i>
                            Volver al Panel
                        </button>



                        {/* Encabezado del Card */}
                        <div className="text-center mb-8 pb-5 border-b-2 border-[#e6ffe6]">
                            <i className="fas fa-graduation-cap text-5xl text-[#39a900] mb-3 block"></i>
                            <h2 className="text-[#005600] text-3xl font-bold mb-1">
                                Registro de Programas de Formación
                            </h2>
                            <p className="text-[#666] text-sm">
                                Utilizado para registrar nuevos programas y fichas de formación.
                            </p>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Título de Sección */}
                            <div className="flex items-center text-lg font-bold text-[#005600] bg-[#e9f5e9] px-4 py-2.5 rounded-md border-l-[5px] border-[#39a900]">
                                <i className="fas fa-file-alt mr-3"></i>
                                Datos del Programa
                            </div>

                            {/* Grid de Campos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Nombre del Programa */}
                                <div>
                                    <label htmlFor="nombre_programa" className="block mb-1.5 font-semibold text-[#444] text-sm">
                                        Nombre del Programa:
                                    </label>
                                    <input
                                        type="text"
                                        id="nombre_programa"
                                        name="nombre_programa"
                                        value={formData.nombre_programa}
                                        onChange={handleInputChange}
                                        placeholder="Ej: Análisis y Desarrollo de Software"
                                        required
                                        autoComplete="off"
                                        className="w-full px-3 py-3 border border-[#ddd] rounded-md text-base bg-[#fcfcfc] transition-all duration-300 focus:border-[#39a900] focus:shadow-[0_0_8px_rgba(57,169,0,0.2)] focus:bg-white focus:outline-none"
                                    />
                                </div>

                                {/* Nivel */}
                                <div>
                                    <label htmlFor="nivel" className="block mb-1.5 font-semibold text-[#444] text-sm">
                                        Nivel:
                                    </label>
                                    <select
                                        id="nivel"
                                        name="nivel"
                                        value={formData.nivel}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-3 border border-[#ddd] rounded-md text-base bg-[#fcfcfc] transition-all duration-300 focus:border-[#39a900] focus:shadow-[0_0_8px_rgba(57,169,0,0.2)] focus:bg-white focus:outline-none"
                                    >
                                        <option value="" disabled>-- Seleccione un nivel --</option>
                                        <option value="Técnico">Técnico</option>
                                        <option value="Tecnólogo">Tecnólogo</option>
                                        <option value="Operario">Operario</option>
                                    </select>
                                </div>

                                {/* Centro de Formación */}
                                <div>
                                    <label htmlFor="centro_formacion" className="block mb-1.5 font-semibold text-[#444] text-sm">
                                        Centro de Formación:
                                    </label>
                                    <input
                                        type="text"
                                        id="centro_formacion"
                                        name="centro_formacion"
                                        value={formData.centro_formacion}
                                        onChange={handleInputChange}
                                        placeholder="Ej: Centro de Comercio y Servicios"
                                        required
                                        autoComplete="off"
                                        className="w-full px-3 py-3 border border-[#ddd] rounded-md text-base bg-[#fcfcfc] transition-all duration-300 focus:border-[#39a900] focus:shadow-[0_0_8px_rgba(57,169,0,0.2)] focus:bg-white focus:outline-none"
                                    />
                                </div>

                                {/* Número de Ficha */}
                                <div>
                                    <label htmlFor="numero_ficha" className="block mb-1.5 font-semibold text-[#444] text-sm">
                                        Número de Ficha:
                                    </label>
                                    <input
                                        type="text"
                                        id="numero_ficha"
                                        name="numero_ficha"
                                        value={formData.numero_ficha}
                                        onChange={handleInputChange}
                                        placeholder="Ej: 2758369"
                                        required
                                        pattern="[0-9]+"
                                        title="Solo se permiten números"
                                        maxLength="20"
                                        autoComplete="off"
                                        className="w-full px-3 py-3 border border-[#ddd] rounded-md text-base bg-[#fcfcfc] transition-all duration-300 focus:border-[#39a900] focus:shadow-[0_0_8px_rgba(57,169,0,0.2)] focus:bg-white focus:outline-none"
                                    />
                                </div>

                                {/* Jornada */}
                                <div>
                                    <label htmlFor="id_jornada" className="block mb-1.5 font-semibold text-[#444] text-sm">
                                        Jornada:
                                    </label>
                                    <select
                                        id="id_jornada"
                                        name="id_jornada"
                                        value={formData.id_jornada}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-3 border border-[#ddd] rounded-md text-base bg-[#fcfcfc] transition-all duration-300 focus:border-[#39a900] focus:shadow-[0_0_8px_rgba(57,169,0,0.2)] focus:bg-white focus:outline-none"
                                    >
                                        <option value="" disabled>-- Seleccione una jornada --</option>
                                        {jornadas.length > 0 ? (
                                            jornadas.map((jornada) => (
                                                <option key={jornada.id_jornada} value={jornada.id_jornada}>
                                                    {jornada.nombre_jornada}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">No hay jornadas registradas</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Acciones del Formulario */}
                            <div className="flex justify-center items-center mt-10 pt-5 border-t border-[#eee]">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 bg-[#39a900] text-white border-none rounded-md text-lg font-bold cursor-pointer transition-all duration-300 shadow-[0_4px_10px_rgba(57,169,0,0.3)] hover:bg-[#005600] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <i className="fas fa-save mr-2"></i>
                                    {loading ? 'Guardando...' : 'Guardar Programa'}
                                </button>
                            </div>
                            {/* Mensajes de Estado */}
                            {errorMessage && (
                                <div className="flex items-center p-4 mb-4 bg-[#ffe6e6] text-[#cc0000] border border-[#ff3333] rounded-lg shadow-sm animate-fade-in">
                                    <i className="fas fa-times-circle text-xl mr-3"></i>
                                    <span className="font-bold text-sm">Error al registrar: {errorMessage}</span>
                                </div>
                            )}

                            {successMessage && (
                                <div className="flex items-center p-4 mb-4 bg-[#e6ffe6] text-[#005600] border border-[#39a900] rounded-lg shadow-sm animate-fade-in">
                                    <i className="fas fa-check-circle text-xl mr-3"></i>
                                    <span className="font-bold text-sm">{successMessage}</span>
                                </div>
                            )}
                        </form>
                    </div>

                </div>
            </main>
        </DashboardLayout>
    );
}