module.exports = {
    extends: ['@commitlint/config-conventional'],
    parserPreset: {
        parserOpts: {
            headerPattern: /^(\w*)\((\w*)\): (.*)$/,
            headerCorrespondence: ['type', 'scope', 'subject'],
        },
    },
    rules: {
        'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'chore', 'test', 'docs', 'style']],
        'scope-enum': [2, 'always', ['general', 'housekeeping']],
        'scope-empty': [2, 'never'],
    },
};
