class StorageUnavailableError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "StorageUnavailableError";
  }
}

module.exports = { StorageUnavailableError };
