const { PartRequest } = require('../models');
const mailTrackService = require('./mailTrack.service');

exports.createRequest = async (userId, userEmail, data, file) => {
    const fotografia = file ? `/uploads/requests/${file.filename}` : null;
    const request = await PartRequest.create({
        user_id: userId,
        user_email: userEmail,
        marca_vehiculo: data.marca_vehiculo,
        modelo: data.modelo,
        anio: parseInt(data.anio, 10),
        descripcion: data.descripcion,
        fotografia,
        ciudad: data.ciudad,
        urgencia: data.urgencia || 'MEDIA',
        estado: 'PUBLICADA'
    });

    const trackingUrl = `http://localhost:3000/solicitudes/${request.id}/tracking`;
    await mailTrackService.sendRequestStatusUpdate(userEmail, request, trackingUrl);
    return request;
};

exports.getAllRequests = async (filters = {}) => {
    const where = {};
    if (filters.ciudad) where.ciudad = filters.ciudad;
    if (filters.estado) where.estado = filters.estado;
    return await PartRequest.findAll({ where, order: [['createdAt', 'DESC']] });
};

exports.getRequestById = async (id) => {
    return await PartRequest.findByPk(id);
};

exports.updateRequestStatus = async (id, nuevoEstado) => {
    const request = await PartRequest.findByPk(id);
    if (!request) return null;

    request.estado = nuevoEstado;
    await request.save();

    const trackingUrl = `http://localhost:3000/solicitudes/${request.id}/tracking`;
    await mailTrackService.sendRequestStatusUpdate(request.user_email, request, trackingUrl);
    return request;
};