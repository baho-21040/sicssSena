import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import DashboardLayout from '../../../components/DashboardLayout';

import { API_BASE_URL } from '../../../config/api.js';

export default function EditarPrograma() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();

    // Estados del formulario
    const [formData, setFormData] = useState({
        nombre_programa: '',
        nivel: '',
        centro_formacion: '',
        numero_ficha: '',
        id_jornada: ''
    });

    const [jornadas, setJornadas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const messageRef = useRef(null);

    const API_URL = API_BASE_URL;

    // Niveles predefinidos
    const niveles = [
        "Técnico",
        "Tecnólogo",
        "Operario"
    ];

    // Cargar datos iniciales
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');

                // 1. Cargar Jornadas
                const resJornadas = await fetch(`${API_URL}/api/jornadas`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const dataJornadas = await resJornadas.json();
                if (dataJornadas.status === 'ok') {
                    setJornadas(dataJornadas.jornadas);
                }

                // 2. Cargar Programa
                const resPrograma = await fetch(`${API_URL}/api/coordinacion/programas/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const dataPrograma = await resPrograma.json();

                if (dataPrograma.status === 'ok') {
                    const p = dataPrograma.programa;
                    setFormData({
                        nombre_programa: p.nombre_programa,
                        nivel: p.nivel,
                        centro_formacion: p.centro_formacion,
                        numero_ficha: p.numero_ficha,
                        id_jornada: p.id_jornada
                    });
                } else {
                    setError('No se pudo cargar la información del programa.');
                }

            } catch (err) {
                console.error("Error fetching data:", err);
                setError('Error de conexión al cargar datos.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/coordinacion/programas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.status === 'ok') {
                setSuccessMessage('Programa actualizado exitosamente.');
                setTimeout(() => {
                    navigate('/coordinacion/programas');
                }, 2000);
            } else {
                setError(data.message || 'Error al actualizar programa.');
            }
        } catch (err) {
            setError('Error de conexión. Intente nuevamente.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-[#39A900]"></i>
                    <p className="mt-4 text-gray-600">Cargando información...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout title="Control de Salida | Editar Programa">
            <div className="bg-[#f7f9fb] p-8 font-sans ">
                <div className="max-w-[800px] mx-auto bg-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] p-8">

                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#eee]">
                        <h2 className="text-2xl font-bold text-[#2A7D00] flex items-center gap-2">
                            <i className="fas fa-edit"></i> Editar Programa
                        </h2>
                        <Link
                            to="/coordinacion/programas"
                            className="text-[#666] hover:text-[#39A900] transition-colors font-semibold flex items-center gap-2"
                        >
                            <i className="fas fa-arrow-left"></i> Volver
                        </Link>
                    </div>

                    {error && (
                        <div className="bg-[#f8d7da] border border-[#f5c6cb] text-[#721c24] p-4 mb-6 rounded-lg font-bold flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-[#d4edda] border border-[#c3e6cb] text-[#155724] p-4 mb-6 rounded-lg font-bold flex items-center gap-2">
                            <i className="fas fa-check-circle"></i>
                            <p>{successMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                        {/* Nombre del Programa */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="nombre_programa" className="font-bold text-[#444]">Nombre del Programa:</label>
                            <input
                                type="text"
                                id="nombre_programa"
                                name="nombre_programa"
                                value={formData.nombre_programa}
                                onChange={handleInputChange}
                                required
                                className="p-3 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900] transition-all"
                                placeholder="Ej: Análisis y Desarrollo de Software"
                            />
                        </div >

                        {/* Ficha y Nivel (Grid) */}
                        < div className="grid grid-cols-1 md:grid-cols-2 gap-6" >
                            <div className="flex flex-col gap-2">
                                <label htmlFor="numero_ficha" className="font-bold text-[#444]">Número de Ficha:</label>
                                <input
                                    type="number"
                                    id="numero_ficha"
                                    name="numero_ficha"
                                    value={formData.numero_ficha}
                                    onChange={handleInputChange}
                                    required
                                    className="p-3 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900] transition-all"
                                    placeholder="Ej: 2675890"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="nivel" className="font-bold text-[#444]">Nivel de Formación:</label>
                                <select
                                    id="nivel"
                                    name="nivel"
                                    value={formData.nivel}
                                    onChange={handleInputChange}
                                    required
                                    className="p-3 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900] transition-all bg-white"
                                >
                                    <option value="" disabled>Seleccione un nivel</option>
                                    {niveles.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        </div >

                        {/* Centro y Jornada (Grid) */}
                        < div className="grid grid-cols-1 md:grid-cols-2 gap-6" >
                            <div className="flex flex-col gap-2">
                                <label htmlFor="centro_formacion" className="font-bold text-[#444]">Centro de Formación:</label>
                                <input
                                    type="text"
                                    id="centro_formacion"
                                    name="centro_formacion"
                                    value={formData.centro_formacion}
                                    onChange={handleInputChange}
                                    required
                                    className="p-3 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900] transition-all"
                                    placeholder="Ej: Centro de Servicios y Gestión Empresarial"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="id_jornada" className="font-bold text-[#444]">Jornada:</label>
                                <select
                                    id="id_jornada"
                                    name="id_jornada"
                                    value={formData.id_jornada}
                                    onChange={handleInputChange}
                                    required
                                    className="p-3 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39a900] transition-all bg-white"
                                >
                                    <option value="" disabled>Seleccione una jornada</option>
                                    {jornadas.map(j => (
                                        <option key={j.id_jornada} value={j.id_jornada}>{j.nombre_jornada}</option>
                                    ))}
                                </select>
                            </div>
                        </div >

                        {/* Botón Submit */}
                        < div className="mt-4 flex justify-end" >
                            <button
                                type="submit"
                                className="bg-[#39A900] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#2A7D00] transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <i className="fas fa-save"></i> Guardar Cambios
                            </button>
                        </div >

                    </form >
                </div >
            </div >
        </DashboardLayout >
    );
}
