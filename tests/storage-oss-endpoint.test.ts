import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultStorageHost } from '../frontend/lib/storage-host';

test('default storage host keeps the AWS naming without an endpoint', () => {
  assert.equal(defaultStorageHost({ bucket: 'b', region: 'ap-southeast-1' }), 'b.s3.ap-southeast-1.amazonaws.com');
  assert.equal(defaultStorageHost({ bucket: 'b' }), 'b.s3.amazonaws.com');
  assert.equal(defaultStorageHost({ bucket: '' , region: 'x' }), null);
});

test('default storage host follows an S3-compatible endpoint such as Aliyun OSS', () => {
  assert.equal(
    defaultStorageHost({ bucket: 'keyvo-media', region: 'cn-hangzhou', endpoint: 'https://oss-cn-hangzhou.aliyuncs.com' }),
    'keyvo-media.oss-cn-hangzhou.aliyuncs.com',
  );
  assert.equal(defaultStorageHost({ bucket: 'b', region: 'r', endpoint: 'not a url' }), 'b.s3.r.amazonaws.com');
});

test('an OSS endpoint signs uploads against OSS without SDK default checksums', async () => {
  Object.assign(process.env, {
    S3_BUCKET: 'keyvo-media',
    S3_REGION: 'cn-hangzhou',
    S3_ENDPOINT: 'https://oss-cn-hangzhou.aliyuncs.com',
    S3_ACCESS_KEY_ID: 'test-id',
    S3_SECRET_ACCESS_KEY: 'test-secret',
    S3_PUBLIC_BASE_URL: 'https://cdn.example.cn',
  });
  const storage = await import('../frontend/server/storage');
  const signed = await storage.createSignedUploadUrl({ mime: 'image/png', userId: 'u1', fileName: 'a.png' });
  const url = new URL(signed.url);
  assert.equal(url.host, 'keyvo-media.oss-cn-hangzhou.aliyuncs.com');
  assert.equal([...url.searchParams.keys()].some((key) => /checksum/i.test(key)), false, signed.url);
  assert.equal(signed.publicUrl.startsWith('https://cdn.example.cn/'), true);
  assert.equal(storage.extractObjectKeyFromUrl(signed.publicUrl), signed.key);
});
