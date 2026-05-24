import { createApp } from "./app";
import { config } from "./config";
import { createMemoryStore } from "./store/memoryStore";
import { createPostgresStore } from "./store/postgresStore";

const store = config.databaseUrl ? createPostgresStore(config.databaseUrl) : createMemoryStore();
const app = createApp(store);

setInterval(() => {
  store.cleanup().catch((error) => console.error("Cleanup failed", error));
}, 60_000);

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
