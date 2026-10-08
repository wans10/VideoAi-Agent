# Vertex regions in Docker deployments

Use the shared `GOOGLE_VERTEX_LOCATION=global` and
`GOOGLE_VERTEX_API_BASE_URL=https://aiplatform.googleapis.com` for the image client.
Set `GOOGLE_VERTEX_VEO_LOCATION=us-central1` and
`GOOGLE_VERTEX_VEO_API_BASE_URL=https://us-central1-aiplatform.googleapis.com`
for the deployed Veo models. Model access must still be verified for the project.

Veo-specific values take priority over shared settings. When only the Veo location
is supplied, the client derives its regional endpoint instead of inheriting the
shared global endpoint. Deployments without Veo-specific settings retain their
existing shared configuration behavior.

Deploy an image containing this change before changing the shared region on the
server; older images do not read the new Veo variables. Recreate the web container
after updating runtime environment variables. Keep Veo cron polling enabled.

The authenticated readiness probe uses the same Veo endpoint resolver as actual
generation, so its Veo checks remain regional when image checks use global.
