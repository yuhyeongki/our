// tests/harness/assertions.mjs
// Lightweight, zero-dependency test assertion library with colored console reporting

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
};

class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function expect(actual) {
  const matchers = {
    toBe(expected, message = '') {
      if (actual !== expected) {
        throw new AssertionError(
          `${message || 'Expected values to be strictly equal'}\n  Expected: ${JSON.stringify(expected)}\n  Received: ${JSON.stringify(actual)}`,
          actual,
          expected
        );
      }
    },
    notToBe(expected, message = '') {
      if (actual === expected) {
        throw new AssertionError(
          `${message || 'Expected values not to be strictly equal'}\n  Received: ${JSON.stringify(actual)}`,
          actual,
          expected
        );
      }
    },
    toEqual(expected, message = '') {
      if (!deepEqual(actual, expected)) {
        throw new AssertionError(
          `${message || 'Expected objects to be deeply equal'}\n  Expected: ${JSON.stringify(expected, null, 2)}\n  Received: ${JSON.stringify(actual, null, 2)}`,
          actual,
          expected
        );
      }
    },
    toBeTruthy(message = '') {
      if (!actual) {
        throw new AssertionError(
          `${message || 'Expected value to be truthy'}\n  Received: ${JSON.stringify(actual)}`,
          actual,
          true
        );
      }
    },
    toBeFalsy(message = '') {
      if (actual) {
        throw new AssertionError(
          `${message || 'Expected value to be falsy'}\n  Received: ${JSON.stringify(actual)}`,
          actual,
          false
        );
      }
    },
    toBeNull(message = '') {
      if (actual !== null) {
        throw new AssertionError(
          `${message || 'Expected value to be null'}\n  Received: ${JSON.stringify(actual)}`,
          actual,
          null
        );
      }
    },
    notToBeNull(message = '') {
      if (actual === null) {
        throw new AssertionError(
          `${message || 'Expected value NOT to be null'}\n  Received: null`,
          actual,
          'not-null'
        );
      }
    },
    toBeDefined(message = '') {
      if (actual === undefined) {
        throw new AssertionError(
          `${message || 'Expected value to be defined'}\n  Received: undefined`,
          actual,
          'defined'
        );
      }
    },
    toBeUndefined(message = '') {
      if (actual !== undefined) {
        throw new AssertionError(
          `${message || 'Expected value to be undefined'}\n  Received: ${JSON.stringify(actual)}`,
          actual,
          undefined
        );
      }
    },
    toBeGreaterThan(expected, message = '') {
      if (!(actual > expected)) {
        throw new AssertionError(
          `${message || 'Expected value to be greater than expected'}\n  Expected >: ${expected}\n  Received: ${actual}`,
          actual,
          expected
        );
      }
    },
    toBeGreaterThanOrEqual(expected, message = '') {
      if (!(actual >= expected)) {
        throw new AssertionError(
          `${message || 'Expected value to be greater than or equal to expected'}\n  Expected >=: ${expected}\n  Received: ${actual}`,
          actual,
          expected
        );
      }
    },
    toBeLessThan(expected, message = '') {
      if (!(actual < expected)) {
        throw new AssertionError(
          `${message || 'Expected value to be less than expected'}\n  Expected <: ${expected}\n  Received: ${actual}`,
          actual,
          expected
        );
      }
    },
    toBeLessThanOrEqual(expected, message = '') {
      if (!(actual <= expected)) {
        throw new AssertionError(
          `${message || 'Expected value to be less than or equal to expected'}\n  Expected <=: ${expected}\n  Received: ${actual}`,
          actual,
          expected
        );
      }
    },
    toContain(expectedItem, message = '') {
      if (typeof actual === 'string') {
        if (!actual.includes(expectedItem)) {
          throw new AssertionError(
            `${message || 'Expected string to contain substring'}\n  Substring: ${expectedItem}\n  Received: ${actual}`,
            actual,
            expectedItem
          );
        }
      } else if (Array.isArray(actual)) {
        const found = actual.some((item) => deepEqual(item, expectedItem));
        if (!found) {
          throw new AssertionError(
            `${message || 'Expected array to contain item'}\n  Item: ${JSON.stringify(expectedItem)}\n  Array: ${JSON.stringify(actual)}`,
            actual,
            expectedItem
          );
        }
      } else {
        throw new AssertionError('toContain requires string or array target', actual, expectedItem);
      }
    },
    toMatch(regex, message = '') {
      if (!regex.test(String(actual))) {
        throw new AssertionError(
          `${message || 'Expected value to match regex'}\n  Regex: ${regex}\n  Received: ${actual}`,
          actual,
          regex
        );
      }
    },
    toThrow(pattern = null, message = '') {
      if (typeof actual !== 'function') {
        throw new AssertionError('toThrow requires a function target', typeof actual, 'function');
      }
      let thrown = null;
      try {
        actual();
      } catch (err) {
        thrown = err;
      }
      if (!thrown) {
        throw new AssertionError(
          message || 'Expected function to throw an error, but it did not',
          'no error',
          'error'
        );
      }
      if (pattern) {
        if (typeof pattern === 'string' && !thrown.message.includes(pattern)) {
          throw new AssertionError(
            `Expected thrown error message to include "${pattern}", but received: "${thrown.message}"`,
            thrown.message,
            pattern
          );
        } else if (pattern instanceof RegExp && !pattern.test(thrown.message)) {
          throw new AssertionError(
            `Expected thrown error message to match ${pattern}, but received: "${thrown.message}"`,
            thrown.message,
            pattern
          );
        }
      }
    },
  };

  matchers.not = {
    toBe(expected, message = '') {
      if (actual === expected) {
        throw new AssertionError(
          `${message || 'Expected values not to be strictly equal'}\n  Received: ${JSON.stringify(actual)}`,
          actual,
          expected
        );
      }
    },
    toEqual(expected, message = '') {
      if (deepEqual(actual, expected)) {
        throw new AssertionError(
          `${message || 'Expected objects not to be deeply equal'}\n  Received: ${JSON.stringify(actual, null, 2)}`,
          actual,
          expected
        );
      }
    },
    toContain(expectedItem, message = '') {
      if (typeof actual === 'string') {
        if (actual.includes(expectedItem)) {
          throw new AssertionError(
            `${message || 'Expected string NOT to contain substring'}\n  Substring: ${expectedItem}\n  Received: ${actual}`,
            actual,
            expectedItem
          );
        }
      } else if (Array.isArray(actual)) {
        const found = actual.some((item) => deepEqual(item, expectedItem));
        if (found) {
          throw new AssertionError(
            `${message || 'Expected array NOT to contain item'}\n  Item: ${JSON.stringify(expectedItem)}`,
            actual,
            expectedItem
          );
        }
      } else {
        throw new AssertionError('toContain requires string or array target', actual, expectedItem);
      }
    },
    toBeNull(message = '') {
      if (actual === null) {
        throw new AssertionError(
          `${message || 'Expected value not to be null'}\n  Received: null`,
          actual,
          'not-null'
        );
      }
    },
    toMatch(regex, message = '') {
      if (regex.test(String(actual))) {
        throw new AssertionError(
          `${message || 'Expected value NOT to match regex'}\n  Regex: ${regex}\n  Received: ${actual}`,
          actual,
          regex
        );
      }
    },
  };

  return matchers;
}

export class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeEachFns = [];
    this.afterEachFns = [];
  }

  beforeEach(fn) {
    this.beforeEachFns.push(fn);
  }

  afterEach(fn) {
    this.afterEachFns.push(fn);
  }

  it(description, fn) {
    this.tests.push({ description, fn });
  }

  async run(context = {}) {
    console.log(`\n${colors.bold}${colors.cyan}▶ Suite: ${this.name}${colors.reset}`);
    let passed = 0;
    let failed = 0;
    const errors = [];

    for (const test of this.tests) {
      const startTime = Date.now();
      try {
        for (const hook of this.beforeEachFns) {
          await hook(context);
        }
        await test.fn(context);
        for (const hook of this.afterEachFns) {
          await hook(context);
        }
        const duration = Date.now() - startTime;
        console.log(`  ${colors.green}✔ PASS${colors.reset} ${test.description} ${colors.gray}(${duration}ms)${colors.reset}`);
        passed++;
      } catch (err) {
        const duration = Date.now() - startTime;
        console.log(`  ${colors.red}✖ FAIL${colors.reset} ${test.description} ${colors.gray}(${duration}ms)${colors.reset}`);
        console.log(`    ${colors.red}${err.message}${colors.reset}`);
        if (err.stack && !err.name.includes('AssertionError')) {
          console.log(`    ${colors.gray}${err.stack.split('\n').slice(1, 4).join('\n    ')}${colors.reset}`);
        }
        failed++;
        errors.push({ description: test.description, error: err });
      }
    }

    return { total: this.tests.length, passed, failed, errors };
  }
}
