# Model gateway

One step of a prompt. The runner hands it the messages so far and the list of tools and resources. It asks the model what to do next.

The model picks one tool or resource and fills in its arguments, or it writes the answer. A step returns one of those, never both, and never more than one tool or resource.

## What goes in

Messages are the conversation so far, oldest first: earlier prompts and answers, tool results, and resource reads. A tool result and a resource read are passed on as user messages labeled "Tool result" and "Resource result". The provider only accepts a tool message when it follows a call id, and these messages do not keep one.

The list comes from the MCP server: tools, concrete resources, and resource templates. Each item becomes a function the model can call.

- A tool uses its own argument schema.
- A resource template asks for the variables in its URI template.
- A concrete resource takes no arguments.

The model and its API key come from config. Tests can pass their own fetch.

## What comes back

A selection has a domain, a name, a kind, and the arguments. The kind is `tool` or `resource`. A resource template comes back as `resource`.

The answer is the text the model wrote when it did not call a function.

Arguments are checked against that item before they are returned. A function that is not in the list is rejected.

Two items with the same kind, domain, and name cannot sit in one list. A concrete resource and a template share the kind `resource`, so they cannot share a domain and name either.

## When it fails

A bad response, a network error, or arguments that do not match the item fail the step as a provider failure. Stopping the prompt aborts the request. That abort is passed back as an abort, so the runner can tell a stop from a provider failure.
