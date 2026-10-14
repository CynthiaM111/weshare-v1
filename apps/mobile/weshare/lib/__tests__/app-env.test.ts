import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppEnv, isProductionApp, isSandboxApp, DEV_UI_ENABLED } from '../app-env.ts';

test('app-env: unset EXPO_PUBLIC_APP_ENV fails closed to production', () => {
  const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
  try {
    delete process.env.EXPO_PUBLIC_APP_ENV;
    assert.equal(getAppEnv(), 'production');
    assert.equal(isProductionApp(), true);
    assert.equal(isSandboxApp(), false);
  } finally {
    process.env.EXPO_PUBLIC_APP_ENV = origEnv;
  }
});

test('app-env: unknown EXPO_PUBLIC_APP_ENV fails closed to production', () => {
  const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
  try {
    process.env.EXPO_PUBLIC_APP_ENV = 'unknown_env';
    assert.equal(getAppEnv(), 'production');
    assert.equal(isProductionApp(), true);
    assert.equal(isSandboxApp(), false);

    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    assert.equal(getAppEnv(), 'production');
    assert.equal(isProductionApp(), true);

    process.env.EXPO_PUBLIC_APP_ENV = '';
    assert.equal(getAppEnv(), 'production');
    assert.equal(isProductionApp(), true);
  } finally {
    process.env.EXPO_PUBLIC_APP_ENV = origEnv;
  }
});

test('app-env: explicit sandbox or development enables sandbox', () => {
  const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
  try {
    process.env.EXPO_PUBLIC_APP_ENV = 'sandbox';
    assert.equal(getAppEnv(), 'sandbox');
    assert.equal(isSandboxApp(), true);
    assert.equal(isProductionApp(), false);

    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    assert.equal(getAppEnv(), 'sandbox');
    assert.equal(isSandboxApp(), true);
    assert.equal(isProductionApp(), false);
  } finally {
    process.env.EXPO_PUBLIC_APP_ENV = origEnv;
  }
});
