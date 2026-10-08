import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoogleVertexVeoConfig, resolveGoogleVertexVeoEndpoint } from '../frontend/src/server/video-providers/google-vertex-veo/client';

test('Veo configuration precedence covers absent, empty, whitespace and explicit values', () => {
  const values = [undefined, '', '   ', 'us-central1'];
  const urls = [undefined, '', '   ', 'https://regional.example.com'];
  for (const veoLocation of values) for (const sharedLocation of values) {
    for (const veoUrl of urls) for (const sharedUrl of urls) {
      const env = {
        GOOGLE_VERTEX_VEO_LOCATION: veoLocation,
        GOOGLE_VERTEX_LOCATION: sharedLocation,
        GOOGLE_VERTEX_VEO_API_BASE_URL: veoUrl,
        GOOGLE_VERTEX_API_BASE_URL: sharedUrl,
      };
      const result = resolveGoogleVertexVeoEndpoint(env);
      const location = veoLocation?.trim() || sharedLocation?.trim() || 'us-central1';
      assert.equal(result.location, location);
      if (veoUrl?.trim()) assert.equal(result.apiBaseUrl, veoUrl.trim());
      else if (veoLocation?.trim() || !sharedUrl?.trim()) {
        assert.equal(result.apiBaseUrl, `https://${location}-aiplatform.googleapis.com`);
      } else assert.equal(result.apiBaseUrl, sharedUrl.trim());
    }
  }
});

test('Veo regional endpoint stays independent of global image configuration', () => {
  const keys = ['GOOGLE_VERTEX_PROJECT_ID', 'GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON', 'GOOGLE_VERTEX_LOCATION', 'GOOGLE_VERTEX_API_BASE_URL', 'GOOGLE_VERTEX_VEO_LOCATION', 'GOOGLE_VERTEX_VEO_API_BASE_URL'];
  const original = keys.map((key) => process.env[key]);
  try {
    process.env.GOOGLE_VERTEX_PROJECT_ID = 'test-project';
    process.env.GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'test@example.com', private_key: 'unused' });
    process.env.GOOGLE_VERTEX_LOCATION = 'global';
    process.env.GOOGLE_VERTEX_API_BASE_URL = 'https://aiplatform.googleapis.com';
    process.env.GOOGLE_VERTEX_VEO_LOCATION = 'us-central1';
    delete process.env.GOOGLE_VERTEX_VEO_API_BASE_URL;
    const regional = getGoogleVertexVeoConfig();
    assert.equal(regional.location, 'us-central1');
    assert.equal(regional.apiBaseUrl, 'https://us-central1-aiplatform.googleapis.com');
    process.env.GOOGLE_VERTEX_VEO_API_BASE_URL = 'https://custom.example.com';
    assert.equal(getGoogleVertexVeoConfig().apiBaseUrl, 'https://custom.example.com');
    delete process.env.GOOGLE_VERTEX_VEO_LOCATION;
    delete process.env.GOOGLE_VERTEX_VEO_API_BASE_URL;
    assert.equal(getGoogleVertexVeoConfig().location, 'global');
    assert.equal(getGoogleVertexVeoConfig().apiBaseUrl, 'https://aiplatform.googleapis.com');
  } finally {
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  }
});
