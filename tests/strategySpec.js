var Validator = require('validatorjs');

describe('strategy', function() {
    beforeEach(function () {
        this.strategy = require('../lib/strategy');

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
                    expect(error).toEqual(jasmine.any(this.strategy.Error));

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

describe('strategy validation client-side with an inactive schema and language', function () {	
	beforeEach(function () {
		this.strategy = require('../lib/strategy');

		this.rules = {
			name: 'required',
			email: 'required|email',
			confirm_email: 'required|email'
		};

		this.messages = null;

		this.data = {
			name: '',
			email: 'not-an-email-address',
			confirm_email: 'also-invalid'
		};
		
		this.validateCallback = jasmine.createSpy('validateCallback');
	});	
	
	it('ru', function () {
		this.schemaCallback = function (validator) {
			validator.lang = 'ru';
		}
		this.schema = this.strategy.createInactiveSchema(this.rules, null, this.schemaCallback);					
		
		this.strategy.validate(
			this.data,
			this.schema,
			{},
			this.validateCallback
		);

		expect(this.validateCallback).toHaveBeenCalledWith({
			name: ["Поле name обязательно для заполнения."],
			email: ["Поле email должно быть действительным электронным адресом."],
			confirm_email: ["Поле confirm email должно быть действительным электронным адресом."]
		});
	}); 
	
	it('de', function () {
		this.schemaCallback = function (validator) {
			validator.lang = 'de';
		}
		this.schema = this.strategy.createInactiveSchema(this.rules, null, this.schemaCallback);					
		
		this.strategy.validate(
			this.data,
			this.schema,
			{},
			this.validateCallback
		);

		expect(this.validateCallback).toHaveBeenCalledWith({
			name: ["Das name Feld muss ausgefüllt sein."],
			email: ["Das email Format ist ungültig."],
			confirm_email: ["Das confirm email Format ist ungültig."]
		});
	});
	
	it('es', function () {
		this.schemaCallback = function (validator) {
			validator.lang = 'es';
		}
		this.schema = this.strategy.createInactiveSchema(this.rules, null, this.schemaCallback);					
		
		this.strategy.validate(
			this.data,
			this.schema,
			{},
			this.validateCallback
		);

		expect(this.validateCallback).toHaveBeenCalledWith({
			name: ["El campo name es obligatorio."],
			email: ["El campo email no es un correo válido"],
			confirm_email: ["El campo confirm email no es un correo válido"]
		});
	});
	
	it('fr', function () {
		this.schemaCallback = function (validator) {
			validator.lang = 'fr';
		}
		this.schema = this.strategy.createInactiveSchema(this.rules, null, this.schemaCallback);					
		
		this.strategy.validate(
			this.data,
			this.schema,
			{},
			this.validateCallback
		);

		expect(this.validateCallback).toHaveBeenCalledWith({
			name: ["Le champs name est obligatoire."],
			email: ["Le champs email contient un format invalide."],
			confirm_email: ["Le champs confirm email contient un format invalide."]
		});
	});
	
	it('it', function () {
		this.schemaCallback = function (validator) {
			validator.lang = 'it';
		}
		this.schema = this.strategy.createInactiveSchema(this.rules, null, this.schemaCallback);					
		
		this.strategy.validate(
			this.data,
			this.schema,
			{},
			this.validateCallback
		);

		expect(this.validateCallback).toHaveBeenCalledWith({
			name: ["Il campo name è richiesto."],
			email: ["Il formato dell\'attributo email non è valido."],
			confirm_email: ["Il formato dell\'attributo confirm email non è valido."]
		});
	});
	
});
