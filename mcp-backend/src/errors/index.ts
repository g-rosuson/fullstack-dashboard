/**
 * The named resource does not exist.
 * `message` defaults to "Not found". A module catches this and returns a refusal that names the id.
 */
class NotFoundError extends Error {
    constructor(message = "Not found") {
        super(message);
        this.name = "NotFoundError";
    }
}

/**
 * A dependency responded, but not with usable data.
 * Pass the message the caller should see. This is not a missing resource.
 */
class UpstreamError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UpstreamError";
    }
}

export { NotFoundError, UpstreamError };
