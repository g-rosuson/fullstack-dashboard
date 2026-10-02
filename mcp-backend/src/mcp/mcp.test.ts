import { describe, expect, test } from "bun:test";

import mcp from "./";

import type { Module } from "../modules/types";

function createFixtureModule(name: string, toolNames: readonly string[]): Module {
    return {
        name,
        toolNames,
        register() {},
    };
}

describe("validate", () => {
    test("FR-MCP-CAT-003 empty enrollment is ok", () => {
        expect(() => mcp.validateModules([])).not.toThrow();
    });

    test("distinct module and tool names are ok", () => {
        expect(() => mcp.validateModules([createFixtureModule("a", ["one"]), createFixtureModule("b", ["two"])])).not.toThrow();
    });

    test("FR-MCP-CAT-001 duplicate module names throw", () => {
        expect(() => mcp.validateModules([createFixtureModule("a", ["one"]), createFixtureModule("a", ["two"])])).toThrow("Duplicate module name: a");
    });

    test("FR-MCP-CAT-002 duplicate tool names throw", () => {
        expect(() => mcp.validateModules([createFixtureModule("a", ["echo"]), createFixtureModule("b", ["echo"])])).toThrow("Duplicate tool name: echo");
    });

    test("FR-MCP-CAT-002 two tools in one module with the same name throw", () => {
        expect(() => mcp.validateModules([createFixtureModule("a", ["echo", "echo"])])).toThrow("Duplicate tool name: echo");
    });
});
