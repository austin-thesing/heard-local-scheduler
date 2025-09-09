import { test, expect } from 'bun:test';
import {
  sanitizeInput,
  canonicalKey,
  normalizeFormData,
  determineSchedulerType,
} from '../src/utils/form-utils.js';

test('sanitizeInput escapes HTML entities', () => {
  expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
  );
  expect(sanitizeInput('hello')).toBe('hello');
  expect(sanitizeInput('')).toBe('');
  expect(sanitizeInput(null)).toBe('');
  expect(sanitizeInput(undefined)).toBe('');
});

test('canonicalKey extracts field name from path', () => {
  expect(canonicalKey('0-1/email')).toBe('email');
  expect(canonicalKey('simple_field')).toBe('simple_field');
  expect(canonicalKey('')).toBe('');
  expect(canonicalKey(null)).toBe('null');
});

test('normalizeFormData handles array input', () => {
  const input = [
    { name: 'email', value: 'test@example.com' },
    { name: '0-1/firstname', value: 'John' },
    { name: 'lastname', value: 'Doe' },
  ];

  const result = normalizeFormData(input);

  expect(result.email).toBe('test@example.com');
  expect(result.firstname).toBe('John');
  expect(result.lastname).toBe('Doe');
});

test('normalizeFormData handles object with fields property', () => {
  const input = {
    fields: [
      { name: 'email', value: 'test@example.com' },
      { name: 'firstname', value: 'John' },
    ],
  };

  const result = normalizeFormData(input);

  expect(result.email).toBe('test@example.com');
  expect(result.firstname).toBe('John');
});

test('normalizeFormData handles plain object', () => {
  const input = {
    email: 'test@example.com',
    firstname: 'John',
    lastname: 'Doe',
  };

  const result = normalizeFormData(input);

  expect(result.email).toBe('test@example.com');
  expect(result.firstname).toBe('John');
  expect(result.lastname).toBe('Doe');
});

test('normalizeFormData sanitizes input', () => {
  const input = [
    { name: 'email', value: '<script>alert("xss")</script>' },
    { name: 'firstname', value: 'John' },
  ];

  const result = normalizeFormData(input);

  expect(result.email).toBe(
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
  );
  expect(result.firstname).toBe('John');
});

test('determineSchedulerType detects sole proprietor', () => {
  const formData = {
    does_your_practice_have_multiple_owners: 'no',
  };

  const result = determineSchedulerType(formData, console);

  expect(result).toBe('sole_prop');
});

test('determineSchedulerType detects S corp', () => {
  const formData = {
    does_your_practice_have_multiple_owners: 'yes',
  };

  const result = determineSchedulerType(formData, console);

  expect(result).toBe('s_corp');
});

test('determineSchedulerType handles boolean values', () => {
  const formData1 = {
    does_your_practice_have_multiple_owners: 'false',
  };

  const formData2 = {
    does_your_practice_have_multiple_owners: 'true',
  };

  const result1 = determineSchedulerType(formData1, console);
  const result2 = determineSchedulerType(formData2, console);

  expect(result1).toBe('sole_prop');
  expect(result2).toBe('s_corp');
});

test('determineSchedulerType returns default for unclear response', () => {
  const formData = {
    does_your_practice_have_multiple_owners: 'maybe',
  };

  const result = determineSchedulerType(formData, console);

  expect(result).toBe('default');
});

test('determineSchedulerType returns default when no field found', () => {
  const formData = {
    email: 'test@example.com',
    firstname: 'John',
  };

  const result = determineSchedulerType(formData, console);

  expect(result).toBe('default');
});

test('determineSchedulerType checks multiple field names', () => {
  const formData = {
    is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_: 'yes',
  };

  const result = determineSchedulerType(formData, console);

  expect(result).toBe('s_corp');
});
