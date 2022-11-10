module.exports = {
    extends: ['eslint:recommended', 'plugin:vue/recommended', 'plugin:prettier/recommended'],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@babel/eslint-parser',
        sourceType: 'module',
    },
    env: {
        browser: true,
        commonjs: true,
        es6: true,
        node: true,
    },
    rules: {
        'no-debugger': 'warn',
        'prettier/prettier': 'error',
        'vue/component-tags-order': 'off',
        'vue/html-indent': ['error', 4],
        'vue/html-self-closing': ['error', { html: { void: 'any' } }],
        'vue/max-attributes-per-line': 'off',
        'vue/multi-word-component-names': 'off',
        'vue/one-component-per-file': 'off',
    },
    globals: {
        spa: 'readonly',
        app: 'readonly',
        Vue: 'readonly',
    },
};
