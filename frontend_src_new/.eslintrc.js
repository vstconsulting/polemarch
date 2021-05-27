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
        'prettier/prettier': 'warn',
        'vue/html-indent': ['error', 4],
        'vue/html-self-closing': ['error', { html: { void: 'any' } }],
        'vue/max-attributes-per-line': 'off',
        'vue/component-tags-order': 'off',
    },
    globals: {
        spa: 'readonly',
        app: 'readonly',
        Vue: 'readonly',
    },
};
