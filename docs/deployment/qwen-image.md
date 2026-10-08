# Qwen Image 3.0 on Docker

Qwen Image 3.0 and Pro use the direct Alibaba DashScope synchronous image endpoint.
The source contract is [Alibaba's image generation and editing API](https://docs.bailian.console.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference).

This integration exposes one PNG output per request, text-to-image and editing with
1–3 reference images, 1K/2K area presets and seven aspect ratios. The API supports
more outputs, but this integration intentionally starts with one. Automatic output
size is absent so the quote cannot silently cross the Pro billing tier boundary.
Model identity is `qwen-image-3-0` / `qwen-image-3-0-pro` inside the application;
provider requests use `qwen-image-3.0` / `qwen-image-3.0-pro`.

Set these server variables in `.env.production` (existing Alibaba video settings
can be reused when they point to the same Beijing workspace):

```dotenv
ALIBABA_MODEL_STUDIO_API_KEY=<Beijing workspace API key>
ALIBABA_MODEL_STUDIO_BASE_URL=https://<WorkspaceId>.cn-beijing.maas.aliyuncs.com
```

The base URL is an HTTPS origin without `/api/v1` or another path. No new public
browser key, image model-ID variable or cron script is required. The application
appends `/api/v1/services/aigc/multimodal-generation/generation`. Credentials,
endpoint and model access must belong to the same region/workspace.
The current rate table is Beijing-only. The image adapter rejects other regions
instead of silently applying Beijing costs to a different regional account.

Provider output links expire after 24 hours. The application signs owned reference
URLs, copies outputs into its configured S3 storage and prepares thumbnails before
recording success. Provider or output-copy failure uses the existing failed-job
and wallet refund path. The diagnostic provider is `alibaba_qwen_image_direct` in
`fal_queue_log`; the provider request ID is retained when output persistence fails.

Beijing console rates supplied on 2026-10-08: Standard output ¥0.18 at either tier;
Pro output ¥0.25 at 1K / ¥0.50 at 2K; reference input ¥0.02 per image at either tier.
Billing tiers are defined by output area: ≤2,250,000 pixels is 1K, above is 2K.
The fixed presets preserve that distinction for every offered aspect ratio.
Canonical provider facts remain USD in this repository; these CNY rates are
converted using the application's explicit accounting rate of 8 CNY/USD.
This is an accounting convention, not a live foreign-exchange quote. Customer
margin, rounding and final currency remain owned by the canonical pricing policy.

After building and pulling the new image, recreate the web service:

```bash
cd /opt/1panel/docker/compose/videoai
sudo docker compose -f docker-compose.yml --env-file .env pull web
sudo docker compose -f docker-compose.yml --env-file .env up -d --no-deps --force-recreate web
sudo docker compose -f docker-compose.yml --env-file .env ps web
```

Test each model with one 1K text-only request, then an edit with one non-sensitive
reference image. Confirm displayed pricing, saved output, library thumbnail and
download. Pro 2K should quote a higher cost than Pro 1K. The models are application
entries only; marketing/model pages and public pricing tables are not published.

Synchronous generation may occupy the request for several minutes. The provider
client timeout is 600 seconds; configure the production reverse proxy's upstream
read timeout to at least 660 seconds for `/api/images/generate`. Browser/proxy
timeouts and container restarts are not durable asynchronous recovery. Do not
resubmit a timed-out request automatically: it can incur a second provider charge.
Deploy/restart after outstanding image requests finish. Async polling is a separate
future implementation and is not provided by the Alibaba video cron job.
