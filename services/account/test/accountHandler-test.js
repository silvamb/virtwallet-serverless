const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;

const accountHandler = require('../src/accountHandler');

class DynamoDbMock  {

    constructor(validateFunction, returnValues) {
        this.validateFunction = validateFunction;
        this.returnValues = returnValues;
    }

    putItem(params) {
        this.validateFunction(params);

        return {
            promise: () => {
                return Promise.resolve({ ConsumedCapacity: 1 });
            }
        }
    }

    query(params) {
        this.validateFunction(params);

        return {
            promise: () => {
                return this.returnValues;
            }
        }
    }

    
};

describe('AccountHandler unit tests', () => {
    describe('create account tests', () => {
        it('should create account with success', () => {

            const eventBody = {
                name: "Account Name",
                description: "Account Description"
            };

            const event = {
                httpMethod: 'POST',
                requestContext: {
                    authorizer: {
                        claims: {
                            aud: "10v21l6b17g3t27sfbe38b0i8n"
                        }
                    }
                },
                body: JSON.stringify(eventBody)
            };

            const validateParams = (params) => {
                expect(params.Item.ownerId.S).to.be.equal("10v21l6b17g3t27sfbe38b0i8n");
                expect(params.Item.name.S).to.be.equal("Account Name");
                expect(params.Item.description.S).to.be.equal("Account Description");
            };

            const promise = accountHandler.handle(event, new DynamoDbMock(validateParams));

            return Promise.all([
                expect(promise).to.eventually.has.property("ownerId", "10v21l6b17g3t27sfbe38b0i8n"),
                expect(promise).to.eventually.has.property("name", "Account Name"),
                expect(promise).to.eventually.has.property("description", "Account Description")
            ]);
        });
    });

    describe('list account test', () => {
        it('should list accounts from an user', () => {

            const event = {
                httpMethod: 'GET',
                requestContext: {
                    authorizer: {
                        claims: {
                            aud: "10v21l6b17g3t27sfbe38b0i8n"
                        }
                    }
                }
            };

            const validateParams = (params) => {
                expect(params.ExpressionAttributeValues[":pk"].S).to.be.equal("USER#10v21l6b17g3t27sfbe38b0i8n");
                expect(params.KeyConditionExpression).to.be.equal("PK = :pk");
            };

            const expectedResult = {
                Count: 1,
                Items: [
                    {
                        PK: {"S": "USER#10v21l6b17g3t27sfbe38b0i8n"},
                        SK: {"S": "ACCOUNT#10v21l6b17g3t27sfbe38b0i8n#ad7d4de0-184a-4d3d-a4c8-68d5ba87b87f"},
                        accountId:  {"S": "ad7d4de0-184a-4d3d-a4c8-68d5ba87b87f"},
                        ownerId:  {"S": "10v21l6b17g3t27sfbe38b0i8n"},
                        name: {"S": "Account Name"},
                        description: {"S": "Account Description"}
                    }
                ],
                ScannedCount: 2
            };

            const promise = accountHandler.handle(event, new DynamoDbMock(validateParams, expectedResult));

            const expectedList = {
                accountId: "ad7d4de0-184a-4d3d-a4c8-68d5ba87b87f",
                ownerId: "10v21l6b17g3t27sfbe38b0i8n",
                name: "Account Name",
                description: "Account Description"
            };

            return expect(promise).to.eventually.deep.include(expectedList);
        });
    });

    it('should get an account from an user', () => {

        const event = {
            httpMethod: 'GET',
            pathParameters: {
                accountId: "ad7d4de0-184a-4d3d-a4c8-68d5ba87b87f"
            },
            requestContext: {
                authorizer: {
                    claims: {
                        aud: "10v21l6b17g3t27sfbe38b0i8n"
                    }
                }
            }
        };

        const validateParams = (params) => {
            expect(params.ExpressionAttributeValues[":pk"].S).to.be.equal("USER#10v21l6b17g3t27sfbe38b0i8n");
            expect(params.ExpressionAttributeValues[":sk"].S).to.be.equal("ACCOUNT#10v21l6b17g3t27sfbe38b0i8n#ad7d4de0-184a-4d3d-a4c8-68d5ba87b87f");
            expect(params.KeyConditionExpression).to.be.equal("PK = :pk AND SK =:sk");
        };

        const expectedResult = {
            Count: 1,
            Items: [
                {
                    PK: {"S": "USER#10v21l6b17g3t27sfbe38b0i8n"},
                    SK: {"S": "USER#10v21l6b17g3t27sfbe38b0i8n#ad7d4de0-184a-4d3d-a4c8-68d5ba87b87f"},
                    accountId:  {"S": "ad7d4de0-184a-4d3d-a4c8-68d5ba87b87f"},
                    ownerId:  {"S": "10v21l6b17g3t27sfbe38b0i8n"},
                    name: {"S": "Account Name"},
                    description: {"S": "Account Description"}
                }
            ],
            ScannedCount: 1
        };

        const promise = accountHandler.handle(event, new DynamoDbMock(validateParams, expectedResult));

        const expectedAccount = {
            accountId: "ad7d4de0-184a-4d3d-a4c8-68d5ba87b87f",
            ownerId: "10v21l6b17g3t27sfbe38b0i8n",
            name: "Account Name",
            description: "Account Description"
        };

        return expect(promise).to.eventually.become(expectedAccount);
    });
});