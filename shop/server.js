'use strict';
const config = require('./lib/config').load();
const { createApp } = require('./lib/app');

const app = createApp(config);
app.server.listen(config.port, () => console.log(`${config.store.name} listening on ${config.baseUrl} (payments: ${config.provider})`));

// Graceful shutdown so container stops don't cut off in-flight requests.
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { app.close(); setTimeout(() => process.exit(0), 200).unref(); });
