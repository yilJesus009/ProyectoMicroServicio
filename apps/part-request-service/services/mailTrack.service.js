const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

exports.sendRequestStatusUpdate = async (toEmail, requestData, trackingUrl) => {
    const mailOptions = {
        from: '"RepuestosYa Tracking" <no-reply@repuestosya.com>',
        to: toEmail,
        subject: `Actualización de Solicitud #${requestData.id}: Estado [${requestData.estado}]`,
        html: `
            <h2>Hola, tu solicitud de repuesto se ha actualizado</h2>
            <p><strong>Repuesto:</strong> ${requestData.descripcion}</p>
            <p><strong>Vehículo:</strong> ${requestData.marca_vehiculo} ${requestData.modelo} (${requestData.anio})</p>
            <p><strong>Nuevo Estado:</strong> <span style="color: green; font-weight: bold;">${requestData.estado}</span></p>
            <br>
            <p>Puedes hacer el seguimiento en tiempo real de tu solicitud y ofertas ingresando aquí:</p>
            <a href="${trackingUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Rastrear Solicitud</a>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[MailTrack] Correo enviado a ${toEmail} para la solicitud #${requestData.id}`);
    } catch (error) {
        console.error('[MailTrack] Error enviando correo:', error.message);
    }
};