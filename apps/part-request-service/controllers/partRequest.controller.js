const partRequestService = require('../services/partRequest.service');

exports.create = async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        const request = await partRequestService.createRequest(userId, userEmail, req.body, req.file);
        res.status(201).json({ message: 'Solicitud creada con éxito', data: request });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAll = async (req, res) => {
    try {
        const requests = await partRequestService.getAllRequests(req.query);
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const request = await partRequestService.getRequestById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });
        res.status(200).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { estado } = req.body;
        const updated = await partRequestService.updateRequestStatus(req.params.id, estado);
        if (!updated) return res.status(404).json({ message: 'Solicitud no encontrada' });
        res.status(200).json({ message: 'Estado actualizado y notificación enviada', data: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};