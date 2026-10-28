const express = require('express');
const router = express.Router();
const partRequestController = require('../controllers/partRequest.controller');
const requireAuth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/', requireAuth, upload, partRequestController.create);
router.get('/', partRequestController.getAll);
router.get('/:id', partRequestController.getById);
router.patch('/:id/status', requireAuth, partRequestController.updateStatus);

module.exports = router;