require('dotenv').config();

const killPort = require('kill-port');
const app = require('./app');

const PORT = parseInt(process.env.PORT, 10) || 4001;

const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Backend running on http://localhost:${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use.`);
        } else {
            console.error('Server error:', err);
        }
        process.exit(1);
    });

    let shuttingDown = false;
    const shutdownHandler = (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\nCaught ${signal}. Shutting down gracefully...`);

        server.close(() => {
            console.log('Server closed. Port released.');
            process.exit(0);
        });

        setTimeout(() => {
            console.error('Force exiting after timeout');
            process.exit(1);
        }, 5000).unref();
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
    });
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        shutdownHandler('uncaughtException');
    });
};

// Reclaiming the port is a dev-only convenience: it terminates whatever process
// currently holds it, which is not something to do on a shared machine.
if (process.env.NODE_ENV === 'production' || process.env.SKIP_KILL_PORT === 'true') {
    startServer(PORT);
} else {
    killPort(PORT, 'tcp')
        .then(() => {
            console.log(`Port ${PORT} reclaimed. Starting fresh server...`);
            startServer(PORT);
        })
        .catch(() => {
            console.warn(`Port ${PORT} was not in use. Starting server...`);
            startServer(PORT);
        });
}
