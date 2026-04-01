module.exports = {
    extends: ['@commitlint/config-conventional'],
    parserPreset: {
        parserOpts: {
            headerPattern: /^(\w*)\((\w*)\): (.*)$/,
            headerCorrespondence: ['type', 'scope', 'subject'],
        },
    },
    rules: {
        'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'chore', 'test', 'docs']],
        'scope-enum': [2, 'always', ['backend', 'frontend', 'global']],
        'scope-empty': [2, 'never'],
    },
};
