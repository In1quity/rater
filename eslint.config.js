import prettierConfig from 'eslint-config-prettier';

export default [
	{
		languageOptions: {
			ecmaVersion: 2017, // Set to 2017 as per user's requirement
			sourceType: 'module',
			globals: {
				Atomics: 'readonly',
				SharedArrayBuffer: 'readonly',
				$: 'readonly',
				mw: 'readonly',
				OO: 'readonly',
				require: 'readonly',
				console: 'readonly',
				window: 'readonly',
				document: 'readonly',
				alert: 'readonly',
				confirm: 'readonly',
				prompt: 'readonly',
			},
		},
		rules: {
			// Убираем правила, которые конфликтуют с Prettier
			// indent, linebreak-style, quotes, semi теперь управляются Prettier
			'no-unused-vars': 'warn', // Set to warn to allow 'e' in catch blocks
			'no-console': 'off',
		},
	},
	prettierConfig, // Отключает все правила ESLint, которые конфликтуют с Prettier
];
