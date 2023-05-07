module.exports = {
    root: true,
    ignorePatterns: ["projects/**/*"],
    overrides: [
        {
            files: ["*.ts"],
            parserOptions: {
                project: ["tsconfig.json", "e2e/tsconfig.json"],
                createDefaultProgram: true
            },
            plugins: ["@typescript-eslint"],
            extends: [
                "eslint:recommended",
                "plugin:@typescript-eslint/recommended",
                "plugin:@angular-eslint/recommended",
                "plugin:@angular-eslint/template/process-inline-templates"
            ],
            rules: {
                "@angular-eslint/component-selector": [
                    "error",
                    {
                        prefix: "mona",
                        style: "kebab-case",
                        type: "element"
                    }
                ],
                "@angular-eslint/directive-selector": [
                    "error",
                    {
                        prefix: "mona",
                        style: "camelCase",
                        type: "attribute"
                    }
                ],
                "@typescript-eslint/explicit-function-return-type": "off",
                "@typescript-eslint/explicit-member-accessibility": "off",
                "@typescript-eslint/member-ordering": [
                    "error",
                    {
                        classes: {
                            memberTypes: [
                                "signature",
                                "private-static-field",
                                "protected-static-field",
                                "public-static-field",
                                "private-instance-field",
                                "protected-instance-field",
                                "public-instance-field",
                                "private-decorated-field",
                                "protected-decorated-field",
                                "public-decorated-field",
                                "private-abstract-field",
                                "protected-abstract-field",
                                "public-abstract-field",

                                "public-constructor",
                                "protected-constructor",
                                "private-constructor",

                                "private-static-method",
                                "protected-static-method",
                                "public-static-method",

                                "public-instance-method",
                                "public-decorated-method",

                                "protected-instance-method",
                                "protected-decorated-method",

                                "private-instance-method",
                                "private-decorated-method",

                                "private-abstract-method",
                                "protected-abstract-method",
                                "public-abstract-method"
                            ],
                            order: "alphabetically"
                        },
                        interfaces: {
                            order: "alphabetically"
                        }
                    }
                ],
                "@typescript-eslint/naming-convention": [
                    "error",
                    {
                        selector: "default",
                        leadingUnderscore: "forbid",
                        trailingUnderscore: "forbid",
                        format: null
                    },
                    {
                        selector: "accessor",
                        format: ["PascalCase"]
                    },
                    {
                        selector: ["typeLike"], // class, interface, typeAlias, enum, typeParameter
                        format: ["StrictPascalCase"]
                    },
                    {
                        selector: ["classMethod", "function"],
                        format: ["strictCamelCase"]
                    },
                    {
                        selector: "classProperty",
                        format: ["strictCamelCase"]
                    },
                    {
                        selector: ["objectLiteralProperty"],
                        format: ["camelCase"]
                    },
                    {
                        selector: "parameter",
                        format: ["strictCamelCase"]
                    },
                    {
                        selector: "typeParameter",
                        format: ["PascalCase"]
                    },
                    {
                        selector: "typeProperty",
                        format: ["camelCase"]
                    },
                    {
                        selector: "variable",
                        format: ["strictCamelCase"]
                    }
                ],
                "@typescript-eslint/no-inferrable-types": "off"
            },
            overrides: [
                {
                    files: ["*.ts"],
                    rules: {
                        "@typescript-eslint/explicit-function-return-type": ["error"]
                    }
                }
            ]
        },
        {
            files: ["*.html"],
            extends: ["plugin:@angular-eslint/template/recommended"],
            rules: {}
        }
    ]
};
