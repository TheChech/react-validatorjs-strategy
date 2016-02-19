'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _validatorjs = require('validatorjs');

var _validatorjs2 = _interopRequireDefault(_validatorjs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Validate using the validatorjs library as a strategy for react-validation-mixin
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @see https://github.com/skaterdav85/validatorjs
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * @see https://jurassix.gitbooks.io/docs-react-validation-mixin/content/overview/strategies.html
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

exports.default = {
    /**
     * Used to create this.validatorTypes in a React component and to be passed to validate or validateServer
     *
     * @param {Object} rules List of rules as specified by validatorjs
     * @param {Object} messages Optional list of custom messages as specified by validatorjs
     * @param {Function} callback if specified, called to allow customisation of validator
     * @returns {Object}
     */

    createSchema: function createSchema(rules, messages, callback) {
        return {
            rules: rules,
            messages: messages,
            callback: callback
        };
    },

    /**
     * Same as createSchema, but the rules are disabled until activateRule is called
     *
     * @param {Object} rules List of rules as specified by validatorjs
     * @param {Object} messages Optional list of custom messages as specified by validatorjs
     * @param {Function} callback if specified, called to allow customisation of validator
     * @returns {Object}
     */
    createInactiveSchema: function createInactiveSchema(rules, messages, callback) {
        var schema = this.createSchema(rules, messages, callback);
        schema.activeRules = [];

        return schema;
    },

    /**
     * Active a specific rule
     *
     * @param {Object} schema As created by createInactiveSchema
     * @param {Object} rule Name of the rule as a key in schema.rules
     */
    activateRule: function activateRule(schema, rule) {
        if (typeof schema.activeRules !== 'undefined' && schema.activeRules.indexOf(rule) === -1) {
            schema.activeRules.push(rule);
        }
    },

    /**
     * Create a validator from submitted data and a schema
     *
     * @param {Object} data The data submitted
     * @param {Object} schema Contains rules and custom error messages
     * @param {Boolean} forceActive Whether to force all rules to be active even if not activated
     * @returns {Validator}
     */
    createValidator: function createValidator(data, schema, forceActive) {
        var rules = {};

        // Only add active rules to the validator if an initially inactive schema has been created.
        if (typeof schema.activeRules !== 'undefined') {
            // Force all rules to be active if specified
            if (forceActive) {
                schema.activeRules = Object.keys(schema.rules);
            }

            for (var i in schema.activeRules) {
                var ruleName = schema.activeRules[i];

                rules[ruleName] = schema.rules[ruleName];
            }
        } else {
            rules = schema.rules;
        }

        var validator = new _validatorjs2.default(data, rules, schema.messages);

        // If a callback has been specified on the schema, call it to allow customisation of the validator
        if (typeof schema.callback === 'function') {
            schema.callback(validator);
        }

        return validator;
    },

    /**
     * Called by react-validation-mixin
     *
     * @param {Object} data The data submitted
     * @param {Object} schema Contains rules and custom error messages
     * @param {Object} options Contains name of element being validated and previous errors
     * @param {Function} callback Called and passed the errors after validation
     */
    validate: function validate(data, schema, options, callback) {
        // If the whole form has been submitted, then activate all rules
        var forceActive = !options.key;
        var validator = this.createValidator(data, schema, forceActive);

        var getErrors = function getErrors() {
            // If a single element is being validated, just get those errors.
            // Otherwise get all of them.
            if (options.key) {
                options.prevErrors[options.key] = validator.errors.get(options.key);
                callback(options.prevErrors);
            } else {
                callback(validator.errors.all());
            }
        };

        // Run the validator asynchronously in case any async rules have been added
        validator.checkAsync(getErrors, getErrors);
    },

    /**
     * Validate server-side returning a Promise to easier handle results.
     * All inactive rules will be forced to activate.
     *
     * @param {Object} data The data submitted
     * @param {Object} schema Contains rules and custom error messages
     * @returns {Promise}
     */
    validateServer: function validateServer(data, schema) {
        var _this = this;

        var validator = this.createValidator(data, schema, true);

        return new Promise(function (resolve, reject) {
            validator.checkAsync(function () {
                resolve();
            }, function () {
                var e = new _this.Error('A validation error occurred');
                e.errors = validator.errors.all();

                reject(e);
            });
        });
    },

    /**
     * Extension of the built-in Error. Created by validateServer when validation fails.
     * Exists so that middleware can check it with instanceof: if (err instanceof strategy.Error)
     *
     * @property {Object} errors Contains the error messages by field name.
     */
    Error: function (_Error) {
        _inherits(_class, _Error);

        function _class() {
            _classCallCheck(this, _class);

            return _possibleConstructorReturn(this, Object.getPrototypeOf(_class).apply(this, arguments));
        }

        return _class;
    }(Error)
};