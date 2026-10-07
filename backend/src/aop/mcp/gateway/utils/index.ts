import { SchemaValidationException } from 'aop/exceptions';

import { STEP_INSTRUCTIONS } from '../constants';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { CatalogEntry, ModelList, ModelMessage, ProviderTool } from '../types';

import { isObject } from 'utils';

/**
 * Turns the MCP list into provider functions and a name lookup.
 * A concrete resource and a resource template share kind `resource`, so they cannot share a domain and name.
 *
 * @param list Tools, resources, and resource templates from the MCP server
 * @returns The functions to send, and the map from function name back to the list item
 * @throws SchemaValidationException when two items would map to the same kind, domain, and name,
 * or the same function name
 */
const buildCatalog = (list: ModelList): { tools: ProviderTool[]; lookup: Map<string, CatalogEntry> } => {
    /**
     * JSON schema for a function that takes no arguments.
     */
    const noArgumentsSchema = (): Record<string, unknown> => ({
        type: 'object',
        properties: {},
        additionalProperties: false,
    });

    /**
     * Description the model sees for one list item: its own text, then domain, name, and a URI or URI template.
     *
     * @param domain Item domain
     * @param name Item name
     * @param description Item description from the MCP list
     * @param detail URI for a concrete resource, or URI template for a template
     */
    const catalogDescription = (domain: string, name: string, description?: string, detail?: string): string => {
        const lines = [`Domain: ${domain}`, `Name: ${name}`];

        if (description) {
            lines.unshift(description);
        }

        if (detail) {
            lines.push(detail);
        }

        return lines.join('\n');
    };

    /**
     * Object schema whose required string fields are the URI template variables.
     *
     * @param template URI template from the MCP list
     */
    const templateParameters = (template: string): Record<string, unknown> => {
        /**
         * Reads RFC 6570 variable names out of a URI template.
         *
         * @param uriTemplate URI template from the MCP list
         * @returns Variable names in first-seen order
         */
        const uriTemplateVariables = (uriTemplate: string): string[] => {
            const variableName = /^([A-Za-z0-9_]+)/;
            const names: string[] = [];
            const expressions = /\{[+#./;?&]?([^}]+)\}/g;

            for (const match of uriTemplate.matchAll(expressions)) {
                for (const part of match[1].split(',')) {
                    const variable = variableName.exec(part.trim())?.[1];

                    if (variable && !names.includes(variable)) {
                        names.push(variable);
                    }
                }
            }

            return names;
        };

        const variables = uriTemplateVariables(template);
        const properties = Object.fromEntries(variables.map(variable => [variable, { type: 'string' }]));

        return {
            type: 'object',
            properties,
            required: variables,
            additionalProperties: false,
        };
    };

    const tools: ProviderTool[] = [];
    const lookup = new Map<string, CatalogEntry>();
    const identities = new Set<string>();

    /**
     * Adds one list item to the provider functions and the lookup.
     * Rejects a second item with the same kind, domain, and name, or the same function name.
     *
     * @param source Which list the item came from. A template stays `resource` in `kind`
     * @param domain Item domain
     * @param name Item name
     * @param kind `tool` or `resource`, the kind the step returns
     * @param parameters Schema the function arguments must match
     * @param description Text the model sees for this function
     * @throws SchemaValidationException when this item collides with one already added
     */
    const add = (
        source: 'tool' | 'resource' | 'template',
        domain: string,
        name: string,
        kind: 'tool' | 'resource',
        parameters: Record<string, unknown>,
        description: string
    ) => {
        /**
         * Provider-safe function name. The lookup maps it back to domain, name, and kind.
         * Names longer than 64 characters are cut, and characters outside `[A-Za-z0-9_-]` become `_`.
         *
         * @param itemSource Which list the item came from
         * @param itemDomain Item domain
         * @param itemName Item name
         */
        const functionName = (
            itemSource: 'tool' | 'resource' | 'template',
            itemDomain: string,
            itemName: string
        ): string => {
            const maxLength = 64;
            const sanitized = `${itemSource}__${itemDomain}__${itemName}`.replace(/[^A-Za-z0-9_-]/g, '_');

            return sanitized.slice(0, maxLength);
        };

        const identity = `${kind}\n${domain}\n${name}`;

        if (identities.has(identity) || lookup.has(functionName(source, domain, name))) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                issues: [{ property: 'list', message: 'Duplicate tool or resource domain and name' }],
            });
        }

        identities.add(identity);

        const nameForProvider = functionName(source, domain, name);

        lookup.set(nameForProvider, { domain, name, kind, parameters });
        tools.push({
            type: 'function',
            function: {
                name: nameForProvider,
                description,
                parameters,
            },
        });
    };

    for (const tool of list.tools) {
        add(
            'tool',
            tool.domain,
            tool.name,
            'tool',
            tool.inputSchema ?? noArgumentsSchema(),
            catalogDescription(tool.domain, tool.name, tool.description)
        );
    }

    for (const resource of list.resources) {
        add(
            'resource',
            resource.domain,
            resource.name,
            'resource',
            noArgumentsSchema(),
            catalogDescription(resource.domain, resource.name, resource.description, `URI: ${resource.uri}`)
        );
    }

    for (const template of list.templates) {
        add(
            'template',
            template.domain,
            template.name,
            'resource',
            templateParameters(template.uriTemplate),
            catalogDescription(
                template.domain,
                template.name,
                template.description,
                `URI template: ${template.uriTemplate}`
            )
        );
    }

    return { tools, lookup };
};

/**
 * Maps record messages onto provider roles.
 * `tool` and `resource` become user messages because a provider tool message requires a prior call id.
 *
 * @param messages Messages so far, oldest first
 * @returns Provider messages, with the step instructions first
 */
const toProviderMessages = (messages: ModelMessage[]): { role: 'system' | 'user' | 'assistant'; content: string }[] => [
    { role: 'system', content: STEP_INSTRUCTIONS },
    ...messages.map(message => {
        switch (message.role) {
            case 'user':
            case 'assistant':
                return { role: message.role, content: message.content };
            case 'tool':
                return { role: 'user' as const, content: `Tool result:\n${message.content}` };
            case 'resource':
                return { role: 'user' as const, content: `Resource result:\n${message.content}` };
            default: {
                const unexpected: never = message.role;

                return unexpected;
            }
        }
    }),
];

/**
 * Parses a function-call arguments string into an object.
 *
 * @param raw JSON object string from the provider
 * @returns The object, or undefined when the text is not a JSON object
 */
const parseArguments = (raw: string): Record<string, unknown> | undefined => {
    try {
        const parsed: unknown = JSON.parse(raw);

        return isObject(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
};

/**
 * Checks a JSON value against the subset of JSON Schema the list exposes:
 * type, properties, required, additionalProperties, items, and enum.
 *
 * @param schema Tool input schema, or the schema built from a URI template
 * @param value Parsed function arguments
 * @returns True when the value matches that schema
 */
const matchesSchema = (schema: Record<string, unknown>, value: unknown): boolean => {
    /**
     * Checks one JSON Schema `type`.
     * An unknown type is left unchecked.
     *
     * @param type JSON Schema type name
     * @param typedValue Value to check
     * @param typeSchema Schema that carries `properties`, `items`, and the rest of the type
     */
    const matchesType = (type: string, typedValue: unknown, typeSchema: Record<string, unknown>): boolean => {
        /**
         * Checks an array. When `items` is a schema, every element must match it.
         *
         * @param arraySchema Schema whose `type` is `array`
         * @param arrayValue Value to check
         */
        const matchesArray = (arraySchema: Record<string, unknown>, arrayValue: unknown): boolean => {
            if (!Array.isArray(arrayValue)) {
                return false;
            }

            const items = arraySchema.items;

            if (!isObject(items)) {
                return true;
            }

            return arrayValue.every(item => matchesSchema(items, item));
        };

        /**
         * Checks an object against `required`, `properties`, and `additionalProperties`.
         *
         * @param objectSchema Schema whose `type` is `object`, or that declares object keywords
         * @param objectValue Value to check
         */
        const matchesObject = (objectSchema: Record<string, unknown>, objectValue: unknown): boolean => {
            if (!isObject(objectValue)) {
                return false;
            }

            const required = Array.isArray(objectSchema.required)
                ? objectSchema.required.filter((item): item is string => typeof item === 'string')
                : [];

            for (const key of required) {
                if (!Object.hasOwn(objectValue, key)) {
                    return false;
                }
            }

            const properties = isObject(objectSchema.properties) ? objectSchema.properties : {};

            for (const [key, propertyValue] of Object.entries(objectValue)) {
                if (Object.hasOwn(properties, key)) {
                    const propertySchema = properties[key];

                    if (!isObject(propertySchema) || !matchesSchema(propertySchema, propertyValue)) {
                        return false;
                    }

                    continue;
                }

                if (objectSchema.additionalProperties === false) {
                    return false;
                }

                if (
                    isObject(objectSchema.additionalProperties) &&
                    !matchesSchema(objectSchema.additionalProperties, propertyValue)
                ) {
                    return false;
                }
            }

            return true;
        };

        switch (type) {
            case 'object':
                return matchesObject(typeSchema, typedValue);
            case 'array':
                return matchesArray(typeSchema, typedValue);
            case 'string':
                return typeof typedValue === 'string';
            case 'number':
                return typeof typedValue === 'number' && Number.isFinite(typedValue);
            case 'integer':
                return typeof typedValue === 'number' && Number.isInteger(typedValue);
            case 'boolean':
                return typeof typedValue === 'boolean';
            case 'null':
                return typedValue === null;
            default:
                return true;
        }
    };

    if (Array.isArray(schema.enum)) {
        const allowed = schema.enum.some(item => JSON.stringify(item) === JSON.stringify(value));

        if (!allowed) {
            return false;
        }
    }

    if (Array.isArray(schema.type)) {
        return schema.type.some(item => typeof item === 'string' && matchesType(item, value, schema));
    }

    if (typeof schema.type === 'string') {
        return matchesType(schema.type, value, schema);
    }

    if (schema.properties !== undefined || schema.required !== undefined || schema.additionalProperties !== undefined) {
        return matchesType('object', value, schema);
    }

    return true;
};

export { buildCatalog, toProviderMessages, parseArguments, matchesSchema };
