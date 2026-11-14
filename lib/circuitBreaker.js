const { StorageUnavailableError } = require("../storage/errors");
const { circuitBreakerState } = require("../metrics/registry");

class CircuitBreaker {
  constructor({ failureThreshold = 3, resetTimeout = 10000 } = {}) {
    if (!Number.isInteger(failureThreshold) || failureThreshold <= 0) {
      throw new Error("failureThreshold must be a positive integer");
    }

    if (!Number.isFinite(resetTimeout) || resetTimeout <= 0) {
      throw new Error("resetTimeout must be a positive number");
    }

    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;

    this.state = "CLOSED";
    this.failureCount = 0;
    this.nextAttempt = null;
    this.probeInProgress = false;
    this.generation = 0;

    // Initialize the Prometheus gauge.
    this.#updateMetric();
  }

  async execute(operation) {
    if (typeof operation !== "function") {
      throw new Error("Circuit breaker operation must be a function");
    }

    // OPEN: reject requests until the recovery timeout expires.
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new StorageUnavailableError("Circuit breaker is OPEN");
      }

      this.state = "HALF_OPEN";
      this.#updateMetric();
      this.generation++;
    }

    // HALF_OPEN: allow only one recovery probe.
    let isProbe = false;

    if (this.state === "HALF_OPEN") {
      if (this.probeInProgress) {
        throw new StorageUnavailableError(
          "Circuit breaker recovery probe is already in progress"
        );
      }

      this.probeInProgress = true;
      isProbe = true;
    }

    const currentGeneration = this.generation;

    try {
      const result = await operation();

      if (currentGeneration === this.generation) {
        this.#onSuccess(isProbe);
      }

      return result;
    } catch (error) {
      if (currentGeneration === this.generation) {
        if (error instanceof StorageUnavailableError) {
          this.#onFailure();
        } else if (isProbe) {
          // A non-storage error means the dependency responded.
          this.#transitionToClosed();
        }
      }

      throw error;
    } finally {
      if (isProbe) {
        this.probeInProgress = false;
      }
    }
  }

  #onSuccess(isProbe) {
    if (this.state === "CLOSED") {
      this.failureCount = 0;
      return;
    }

    if (this.state === "HALF_OPEN" && isProbe) {
      this.#transitionToClosed();
    }
  }

  #onFailure() {
    this.failureCount++;

    if (
      this.state === "HALF_OPEN" ||
      this.failureCount >= this.failureThreshold
    ) {
      this.#transitionToOpen();
    }
  }

  #transitionToOpen() {
    this.state = "OPEN";
    this.#updateMetric();

    this.nextAttempt = Date.now() + this.resetTimeout;
    this.probeInProgress = false;
    this.generation++;
  }

  #transitionToClosed() {
    this.state = "CLOSED";
    this.#updateMetric();

    this.failureCount = 0;
    this.nextAttempt = null;
    this.probeInProgress = false;
    this.generation++;
  }

  // Update Prometheus gauge whenever the circuit state changes.
  #updateMetric() {
    const stateValues = {
      CLOSED: 0,
      HALF_OPEN: 1,
      OPEN: 2,
    };

    circuitBreakerState.set(stateValues[this.state]);
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt,
    };
  }
}

module.exports = CircuitBreaker;
