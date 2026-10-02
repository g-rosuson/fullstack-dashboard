import { describe, expect, test } from "bun:test";

import { echo } from "./echo";

describe("echo", () => {
    test("FR-ECHO-MSG-001 returns the provided message", async () => {
        const result = await echo({ message: "hello" });

        expect(result.content[0]?.text).toBe("You said: hello");
    });
});
