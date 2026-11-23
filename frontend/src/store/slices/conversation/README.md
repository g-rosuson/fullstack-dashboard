# Conversation store

A loaded turn holds its own steps. `streamEvents` are the live prompt steps, newest last. `persistedEvents` are the permission and call steps saved with the answer.

## Steps that arrive early

Two fields on the store hold steps that have no turn yet. Both are shared across conversations. Each step carries its `conversationId`.

`pendingTurnEvents` holds a live step that arrives before that conversation's open turn is stored. When the turn is stored, the step moves onto it.

`promptEvents` is the latest connect snapshot. It lists every prompt still running. A prompt whose conversation is not loaded stays in the snapshot. Opening that conversation copies the prompt onto the open turn.

## Why these stay on the store

A conversation is treated as loaded once it is in the store. `Chat` then skips the read, and the composer stops waiting. Creating a conversation from an early step would block the saved turns from loading.

A copy of these lists on each conversation would need a record that is present and not loaded. The shared lists avoid that. They stay small: a step leaves when its turn is stored, or when that conversation is deleted.
