import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWhatsAppUrl, whatsappUrl } from '../src/config/contact.ts';

// These synthetic inputs are used only by this pure helper test; no request is sent.
test('missing build-time configuration cannot produce a live WhatsApp link', () => {
  assert.equal(whatsappUrl, null);
});

test('international formatting is normalized and the prepared message is URL-encoded', () => {
  assert.equal(
    buildWhatsAppUrl('+51 999-123-456', 'Hola, IA & trabajo?'),
    'https://wa.me/51999123456?text=Hola%2C%20IA%20%26%20trabajo%3F',
  );
});

test('empty, local-prefixed, malformed, too short and too long numbers are rejected', () => {
  const invalid = [
    '',
    ' ',
    '012345678',
    '0051999123456',
    '1234567',
    '1234567890123456',
    'abc12345678',
    '1234+56789',
    'https://wa.me/51999123456',
  ];
  for (const number of invalid) {
    assert.equal(buildWhatsAppUrl(number, 'Hola'), null, `Reject ${JSON.stringify(number)}`);
  }
});

test('international numbers at both length limits and with surrounding whitespace are accepted', () => {
  for (const number of ['12345678', '+123456789012345', '  +51 999-123-456  ']) {
    assert.ok(buildWhatsAppUrl(number, 'Hola'), `Accept ${JSON.stringify(number)}`);
  }
});
