var Validator = require('validatorjs');

describe('strategy', function() {
    beforeEach(function () {
        this.strategy = require('../dist/strategy').default;

        this.rules = {
            name: 'required',
            email: 'required|email',
            confirm_email: 'required|email'
        };

        this.messages = {
            'email.email': 'This is not a valid email address'
        };

        this.schemaCallback = jasmine.createSpy('schema.callback');

        this.validateCallback = jasmine.createSpy('validateCallback');
    });

    it('should create a schema containing the rules, messages and callback', function () {
        var schema = this.strategy.createSchema(this.rules, this.messages, this.schemaCallback);

        expect(schema.rules).toEqual(this.rules);
        expect(schema.messages).toEqual(this.messages);
        expect(schema.callback).toEqual(this.schemaCallback);
        expect(schema.activeRules).not.toBeDefined();
    });

    it('should create an inactive schema containing the rules, messages and schemaCallback', function () {
        var schema = this.strategy.createInactiveSchema(this.rules, this.messages, this.schemaCallback);

        expect(schema.rules).toEqual(this.rules);
        expect(schema.messages).toEqual(this.messages);
        expect(schema.callback).toEqual(this.schemaCallback);
        expect(schema.activeRules).toEqual([]);
    });

    it('should activate a rule', function () {
        var schema = this.strategy.createInactiveSchema(this.rules, this.messages, this.schemaCallback);

        this.strategy.activateRule(schema, 'name');
        expect(schema.activeRules).toEqual(['name']);

        this.strategy.activateRule(schema, 'email');
        expect(schema.activeRules).toEqual(['name', 'email']);
    });

    describe('validation', function () {
        beforeEach(function () {
            this.data = {
                name: 'Valid name',
                email: 'not-an-email-address',
                confirm_email: 'also-invalid'
            };
        });

        afterEach(function () {
            expect(this.schemaCallback).toHaveBeenCalledWith(jasmine.any(Validator));
        });

        describe('client-side', function () {
            describe('with a normal schema', function () {
                beforeEach(function () {
                    this.schema = this.strategy.createSchema(this.rules, this.messages, this.schemaCallback);
                });

                it('should validate a single invalid element with the custom message', function () {
                    this.strategy.validate(
                        this.data,
                        this.schema,
                        {
                            key: 'email',
                            prevErrors: {}
                        },
                        this.validateCallback
                    );

                    expect(this.validateCallback).toHaveBeenCalledWith({
                        email: ['This is not a valid email address']
                    });
                });

                it('should validate a single valid element', function () {
                    this.data.email = 'test@example.com';

                    this.strategy.validate(
                        this.data,
                        this.schema,
                        {
                            key: 'email',
                            prevErrors: {}
                        },
                        this.validateCallback
                    );

                    expect(this.validateCallback).toHaveBeenCalledWith({
                        email: []
                    });
                });

                it('should validate all elements with invalid values', function () {
                    this.strategy.validate(
                        this.data,
                        this.schema,
                        {
                            key: undefined,
                            prevErrors: {}
                        },
                        this.validateCallback
                    );

                    expect(this.validateCallback).toHaveBeenCalledWith({
                        email: ['This is not a valid email address'],
                        confirm_email: ['The confirm email format is invalid.']
                    });
                });

                it('should validate all elements with valid values', function () {
                    this.data.email = 'test@example.com';
                    this.data.confirm_email = 'test@example.com';

                    this.strategy.validate(
                        this.data,
                        this.schema,
                        {
                            key: undefined,
                            prevErrors: {}
                        },
                        this.validateCallback
                    );

                    expect(this.validateCallback).toHaveBeenCalledWith({});
                });
            });

            describe('with an inactive schema', function () {
                beforeEach(function () {
                    this.schema = this.strategy.createInactiveSchema(this.rules, this.messages, this.schemaCallback);
                });

                it('should ignore an element if it has not been activated', function () {
                    this.strategy.validate(
                        this.data,
                        this.schema,
                        {
                            key: 'email',
                            prevErrors: {}
                        },
                        this.validateCallback
                    );

                    expect(this.validateCallback).toHaveBeenCalledWith({
                        email: []
                    });
                });

                it('should validate an element if its rule has been activated', function () {
                    this.strategy.activateRule(this.schema, 'email');

                    this.strategy.validate(
                        this.data,
                        this.schema,
                        {
                            key: 'email',
                            prevErrors: {}
                        },
                        this.validateCallback
                    );

                    expect(this.validateCallback).toHaveBeenCalledWith({
                        email: ['This is not a valid email address']
                    });
                });

                it('should ignore an element if another element\'s rule has been activated', function () {
                    this.strategy.activateRule(this.schema, 'confirm_email');

                    this.strategy.validate(
                        this.data,
                        this.schema,
                        {
                            key: 'email',
                            prevErrors: {}
                        },
                        this.validateCallback
                    );

                    expect(this.validateCallback).toHaveBeenCalledWith({
                        email: []
                    });
                });

                it('should validate all elements even if none of them have been activated', function () {
                    this.strategy.validate(
                        this.data,
                        this.schema,
                        {
                            key: undefined,
                            prevErrors: {}
                        },
                        this.validateCallback
                    );

                    expect(this.validateCallback).toHaveBeenCalledWith({
                        email: ['This is not a valid email address'],
                        confirm_email: ['The confirm email format is invalid.']
                    });
                });
            });
        });

        describe('server-side', function () {
            beforeEach(function () {
                // An inactive schema to demonstrate that rules are activated automatically server-side
                this.schema = this.strategy.createInactiveSchema(this.rules, this.messages, this.schemaCallback);
            });

            it('should reject a promise with error messages with invalid input', function (done) {
                this.strategy.validateServer(this.data, this.schema).catch((error) => {
                    expect(error.errors).toEqual({
                        email: ['This is not a valid email address'],
                        confirm_email: ['The confirm email format is invalid.']
                    });

                    done();
                });
            });

            it('should resolve a promise with no errors with valid input', function (done) {
                this.data.email = 'valid@gmail.com';
                this.data.confirm_email = 'valid@gmail.com';

                this.strategy.validateServer(this.data, this.schema).then(() => {
                    done();
                });
            });
        });
    });
});
