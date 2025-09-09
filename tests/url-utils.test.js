import { test, expect } from 'bun:test';
import {
  buildSchedulerUrl,
  getQueryParams,
  isValidHubSpotOrigin,
} from '../src/utils/url-utils.js';

// Mock window.location
global.window = {
  location: {
    search: '?utm_source=google&utm_medium=cpc&utm_campaign=test',
  },
};

test('buildSchedulerUrl creates correct URL with form data', () => {
  const formData = {
    email: 'test@example.com',
    firstname: 'John',
    lastname: 'Doe',
    company: 'Test Corp',
    phone: '555-123-4567',
  };

  const config = {
    sole_prop: {
      url: 'https://meetings.hubspot.com/bz/consultation',
      name: 'Sole Proprietor Consultation',
      description: 'For single-owner practices',
    },
  };

  const result = buildSchedulerUrl('sole_prop', formData, config, console);

  expect(result).toBe(
    'https://meetings.hubspot.com/bz/consultation?embed=true&email=test%40example.com&firstName=John&lastName=Doe&company=Test+Corp&phone=555-123-4567'
  );
});

test('buildSchedulerUrl handles missing form data', () => {
  const formData = {};
  const config = {
    sole_prop: {
      url: 'https://meetings.hubspot.com/bz/consultation',
      name: 'Sole Proprietor Consultation',
      description: 'For single-owner practices',
    },
  };

  const result = buildSchedulerUrl('sole_prop', formData, config, console);

  expect(result).toBe(
    'https://meetings.hubspot.com/bz/consultation?embed=true'
  );
});

test('buildSchedulerUrl includes UTM parameters', () => {
  const formData = {
    email: 'test@example.com',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'test',
  };

  const config = {
    sole_prop: {
      url: 'https://meetings.hubspot.com/bz/consultation',
      name: 'Sole Proprietor Consultation',
      description: 'For single-owner practices',
    },
  };

  const result = buildSchedulerUrl('sole_prop', formData, config, console);

  expect(result).toContain('utm_source=google');
  expect(result).toContain('utm_medium=cpc');
  expect(result).toContain('utm_campaign=test');
});

test('buildSchedulerUrl uses default config when scheduler type not found', () => {
  const formData = {
    email: 'test@example.com',
  };

  const config = {
    sole_prop: {
      url: 'https://meetings.hubspot.com/bz/consultation',
      name: 'Sole Proprietor Consultation',
      description: 'For single-owner practices',
    },
    default: {
      url: 'https://meetings.hubspot.com/bz/default',
      name: 'Default Consultation',
      description: 'Default consultation scheduler',
    },
  };

  const result = buildSchedulerUrl('unknown_type', formData, config, console);

  expect(result).toBe(
    'https://meetings.hubspot.com/bz/default?embed=true&email=test%40example.com'
  );
});

test('buildSchedulerUrl handles additional HubSpot fields', () => {
  const formData = {
    email: 'test@example.com',
    is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_: 'no',
    what_best_describes_your_practice_: 'service',
    referrer: 'google',
  };

  const config = {
    sole_prop: {
      url: 'https://meetings.hubspot.com/bz/consultation',
      name: 'Sole Proprietor Consultation',
      description: 'For single-owner practices',
    },
  };

  const result = buildSchedulerUrl('sole_prop', formData, config, console);

  expect(result).toContain(
    'is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_=no'
  );
  expect(result).toContain('what_best_describes_your_practice_=service');
  expect(result).toContain('referrer=google');
});

test('getQueryParams extracts URL parameters correctly', () => {
  const result = getQueryParams();

  expect(result).toEqual({
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'test',
  });
});

test('getQueryParams handles empty query string', () => {
  global.window.location.search = '';

  const result = getQueryParams();

  expect(result).toEqual({});

  // Restore original
  global.window.location.search =
    '?utm_source=google&utm_medium=cpc&utm_campaign=test';
});

test('getQueryParams handles complex parameters', () => {
  global.window.location.search =
    '?email=test%40example.com&name=John%20Doe&flag1=true&flag2=false';

  const result = getQueryParams();

  expect(result).toEqual({
    email: 'test@example.com',
    name: 'John Doe',
    flag1: 'true',
    flag2: 'false',
  });

  // Restore original
  global.window.location.search =
    '?utm_source=google&utm_medium=cpc&utm_campaign=test';
});

test('isValidHubSpotOrigin validates HubSpot domains', () => {
  expect(isValidHubSpotOrigin('https://forms.hubspot.com')).toBe(true);
  expect(isValidHubSpotOrigin('https://app.hubspot.com')).toBe(true);
  expect(isValidHubSpotOrigin('https://forms.hsforms.com')).toBe(true);
  expect(isValidHubSpotOrigin('https://app.hsforms.net')).toBe(true);
  expect(isValidHubSpotOrigin('https://static.hsappstatic.net')).toBe(true);
});

test('isValidHubSpotOrigin rejects non-HubSpot domains', () => {
  expect(isValidHubSpotOrigin('https://evil.com')).toBe(false);
  expect(isValidHubSpotOrigin('https://phishing.hubspot.com.evil.com')).toBe(
    false
  );
  expect(isValidHubSpotOrigin('https://google.com')).toBe(false);
});

test('isValidHubSpotOrigin handles invalid URLs gracefully', () => {
  expect(isValidHubSpotOrigin('not-a-url')).toBe(false);
  expect(isValidHubSpotOrigin('')).toBe(false);
  expect(isValidHubSpotOrigin(null)).toBe(false);
  expect(isValidHubSpotOrigin(undefined)).toBe(false);
});

test('isValidHubSpotOrigin accepts subdomains', () => {
  expect(isValidHubSpotOrigin('https://sub.forms.hubspot.com')).toBe(true);
  expect(isValidHubSpotOrigin('https://app.na1.hubspot.com')).toBe(true);
});
