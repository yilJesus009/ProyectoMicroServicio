require("dotenv").config();

const express = require("express");

const { sequelize } = require("./models");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ================================
// RUTA DE PRUEBA
// ================================

app.get("/health", (req, res) => {
    res.json({
        service: "part-request-service",
        status: "OK"
    });
});


// ================================
// RUTAS
// ================================

const partRequestRoutes = require("./routes/partRequest.routes");

app.use("/api/requests", partRequestRoutes);


// ================================
// INICIAR SERVIDOR
// ================================

const PORT = process.env.PORT || 4001;

async function startServer() {

    try {

        await sequelize.authenticate();

        console.log(" Base de datos conectada");

        await sequelize.sync();

        console.log(" Modelos sincronizados");

        app.listen(PORT, () => {

            console.log(
                ` Part Request Service ejecutándose en http://localhost:${PORT}`
            );

        });

    } catch (error) {

        console.error(
            "Error al iniciar el servicio:",
            error
        );

    }
}

startServer();