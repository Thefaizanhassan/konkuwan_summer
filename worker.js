// Cloudflare Worker entry point.
//
// The SPA in client/dist is served by Cloudflare's asset store directly (see
// wrangler.jsonc → assets). Only paths matching assets.run_worker_first
// ("/api/*") reach this script, where httpServerHandler bridges the Workers
// fetch interface to Node's http server interface so the existing Express app
// runs unmodified.
import { httpServerHandler } from 'cloudflare:node';
import app from './server/src/app.js';
 
const PORT = 8080;
app.listen(PORT);
 
export default httpServerHandler({ port: PORT });