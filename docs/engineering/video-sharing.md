# Video sharing

The Result modal and media library use `MediaActionPanel.client.tsx`. Image and video sharing use a compact secondary panel below the original download action. The creation composer does not carry a prominent share CTA. Public example videos can use the same panel without a signed-in account. Public `/video/[id]` watch pages keep a compact canonical-link row and creator-center links; they do not mount the owned-media panel.

## Link ownership

- `POST /api/video-shares` checks the exact original URL and the authenticated user's ownership before minting an unguessable `/s/[token]` link. The source remains in `job_outputs`, `media_assets`, `user_assets`, or `app_jobs`; the share table stores only source identity and owner, never a copied media URL.
- Public examples use their existing `/video/[id]` watch page after confirming public visibility, indexability, a stable URL, and an exact original match. Only the explicit `public-example` source takes this path; a user's private result gallery uses authenticated ownership checks. These links need no token or owner revocation.
- `GET /api/video-shares/public-download` streams a verified public example from the owned media CDN. It supports real MP4 saving and compatible browser file shares for visitors; it does not accept an arbitrary source URL.
- `/s/[token]` reads the current source at request time, is excluded from indexing, and disappears if the source is removed or the owner deactivates the link. `DELETE /api/video-shares` requires the owner.
- The token page reuses the public video site's navigation, footer, and watch-page visual language, but only shows the video and generic context. It never promotes a private generation into the indexable `/video/[id]` example route or reveals its prompt or account details. All token URLs use the same route template.
- The underlying original may already be publicly reachable. Deactivating the VideoAI share page does not revoke direct media URLs that a recipient copied separately.
- Signed, temporary, private, and placeholder media URLs cannot receive a lasting link. File sharing remains available when the browser supports it.

The two URL types have different acquisition roles. `/s/[token]` is an unlisted landing page for recipient visits from social posts, messages, and email; it is never submitted as an SEO video page. Curated `/video/[id]` examples are the public, indexable watch pages with editorial context and video metadata. Publishing a customer's generation into that catalog would require a separate, explicit opt-in and quality/rights review; sharing a link must not silently do it.

Apply `neon/migrations/49_video_share_links.sql` before deploying the API and page. This migration does not run in a request path. The new URL must remain same-origin in local development and use `SITE_ORIGIN` in production.

## Domestic destinations — 2026-10-02

The active UI offers **抖音 (Douyin), 小红书 (Xiaohongshu), and 快手 (Kuaishou)**.
`frontend/components/library/domestic-share-platforms.ts` owns their official
creator-center URLs. All three returned HTTP 200 with the expected official
page title during read-only verification on 2026-10-02.

| Action | Behavior |
| --- | --- |
| Select platform | Show preparation steps; does not upload, launch a native share or publish. |
| Download original | Use the existing authorized download path for the exact selected image/video, retaining its original filename/type. |
| Copy caption | Copy the editable caption; changing platforms preserves the text. |
| Open creator center | Open the official portal in a new tab, without adding private media URLs, tokens or text to its query string. The user logs in, selects a publishing mode, attaches the file and confirms. |
| Share through phone apps | Prepare a file only after selection when Web Share file APIs exist. A separate click opens the system sheet; the browser cannot force a particular destination app. |
| Video link | Preserve owned unlisted video-link creation, copying and revocation. |
| Public reader | Copy the canonical watch URL for messages such as WeChat/QQ, or open a creator center with explicit manual-upload guidance. |

Images do not call the video share-link endpoint or create a public token page.
They use original-file download and optional native file sharing. Audio retains
its existing basic share behavior. Unsupported browsers, downloads or native
file sharing keep the manual download/portal path available. No watermark,
transcoding, account OAuth connection or automatic post is introduced.

The platform must accept the chosen media type and publishing mode; an open
creator center is not a completed upload. For native sharing the installed app
may ignore text or may not appear at all. Direct platform publishing would need
separate platform authorization, API eligibility and explicit user review.

The existing video-link server ownership/privacy contracts are unchanged.
`video-share-intents.ts` retains historical pure intent helpers for compatibility,
but foreign-platform links/icons are no longer rendered in these two panels.
Analytics record platform/action identifiers only; never captions, tokens, signed
media or private account details.

## Validation

Run `tests/domestic-media-sharing-dom.test.ts`, `tests/video-watch-share-dom.test.ts`,
`tests/video-sharing.test.ts` and `tests/media-library-contract.test.ts`, plus
frontend lint and typecheck. DOM tests verify exact original-file URL/type,
no image token creation, no automatic native sharing, caption preservation,
canonical-link copy, and clipboard recovery. Local Chrome fixtures at 390/900 px
cover image/video panels without horizontal overflow. Actual posting inside
Douyin, Xiaohongshu, Kuaishou and installed mobile apps was not performed.
